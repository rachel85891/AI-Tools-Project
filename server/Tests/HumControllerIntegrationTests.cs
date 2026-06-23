using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DTOs;
using Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Repositories;
using Services;

namespace Tests;

public class HumControllerIntegrationTests : IAsyncLifetime, IDisposable
{
    // Named shared-cache SQLite keeps ShowsCenterContext satisfied for services that
    // depend on it at DI resolution time, even though all domain repos are mocked.
    private const string TestDb = "DataSource=HumIntegTest;Mode=Memory;Cache=Shared";

    private SqliteConnection _keepAlive = null!;
    private WebApplicationFactory<Program> _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        // Environment variables are read by WebApplication.CreateBuilder() before the factory
        // can inject configuration via ConfigureAppConfiguration — they must be set first.
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
        Environment.SetEnvironmentVariable("JwtSettings__SecretKey",
            "TestSecretKeyForIntegrationTests_MustBe32CharsMin!!!");
        Environment.SetEnvironmentVariable("JwtSettings__Issuer", "TestIssuer");
        Environment.SetEnvironmentVariable("JwtSettings__Audience", "TestAudience");
        Environment.SetEnvironmentVariable("Kafka__BootstrapServers", "localhost:9092");
        Environment.SetEnvironmentVariable("Kafka__TopicName", "order-events");

        // Keep the named in-memory database alive so ShowsCenterContext can resolve
        _keepAlive = new SqliteConnection(TestDb);
        _keepAlive.Open();

        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Program.cs skips SQL Server in Testing env; add SQLite here
                    services.AddDbContext<ShowsCenterContext>(opts =>
                        opts.UseSqlite(TestDb));

                    // Replace Redis IDistributedCache with in-memory to avoid connection errors
                    var redis = services.SingleOrDefault(d =>
                        d.ServiceType == typeof(IDistributedCache));
                    if (redis is not null) services.Remove(redis);
                    services.AddDistributedMemoryCache();

                    // Mock IRatingService: RatingMiddleware and AnalyticsObserver both write to
                    // the ratings table. Replacing with a no-op prevents them from sharing the
                    // scoped ShowsCenterContext and causing SQLite lock contention or context
                    // corruption that would cascade to HumSession writes.
                    var mockRating = new Mock<IRatingService>();
                    mockRating.Setup(r => r.AddRating(It.IsAny<Rating>()))
                              .ReturnsAsync(new Rating());
                    ReplaceService<IRatingService>(services, _ => mockRating.Object);

                    // Mock IHumRepository: avoids all HumSession INSERT/UPDATE on the shared
                    // scoped context, keeping the test focused on the HTTP/controller layer.
                    var savedSession = new HumSession
                    {
                        Id = Guid.NewGuid(),
                        DetectedGenre = string.Empty,
                        RawTranscription = string.Empty,
                        RecommendedShowIds = "[]",
                        SessionStatus = HumSessionStatus.Pending
                    };
                    var mockHumRepo = new Mock<IHumRepository>();
                    mockHumRepo
                        .Setup(r => r.SaveSessionAsync(It.IsAny<HumSession>()))
                        .ReturnsAsync(savedSession);
                    mockHumRepo
                        .Setup(r => r.UpdateSessionAsync(It.IsAny<HumSession>()))
                        .ReturnsAsync((HumSession s) => s);
                    ReplaceService<IHumRepository>(services, _ => mockHumRepo.Object);

                    // Mock IShowsRepository: avoids real SQLite queries so the test focuses
                    // on HTTP routing, validation, and rate-limiting behavior.
                    var mockShowsRepo = new Mock<IShowsRepository>();
                    mockShowsRepo
                        .Setup(r => r.getAllShows(It.IsAny<ShowFilterDTO>()))
                        .Returns(Task.FromResult(((IEnumerable<Show>)new List<Show>(), 0)));
                    ReplaceService<IShowsRepository>(services, _ => mockShowsRepo.Object);

                    // Mock IKafkaProducerService: eliminates the 30-second Kafka connection
                    // timeout when localhost:9092 is unavailable in the test environment.
                    var mockKafka = new Mock<IKafkaProducerService>();
                    mockKafka
                        .Setup(k => k.SendMessageAsync(It.IsAny<string>(), It.IsAny<string>()))
                        .Returns(Task.CompletedTask);
                    ReplaceService<IKafkaProducerService>(services, _ => mockKafka.Object);
                });
            });

        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
        Environment.SetEnvironmentVariable("JwtSettings__SecretKey", null);
        Environment.SetEnvironmentVariable("JwtSettings__Issuer", null);
        Environment.SetEnvironmentVariable("JwtSettings__Audience", null);
        Environment.SetEnvironmentVariable("Kafka__BootstrapServers", null);
        Environment.SetEnvironmentVariable("Kafka__TopicName", null);
    }

    public void Dispose() => _keepAlive.Dispose();

    private static void ReplaceService<TService>(IServiceCollection services, Func<IServiceProvider, TService> factory)
        where TService : class
    {
        var existing = services.Where(d => d.ServiceType == typeof(TService)).ToList();
        foreach (var d in existing) services.Remove(d);
        services.AddScoped(factory);
    }

    private static StringContent ValidBody() =>
        new(
            JsonSerializer.Serialize(new
            {
                audioBase64 = Convert.ToBase64String(new byte[200]),
                durationSeconds = 5.0,
                userId = (string?)null
            }),
            System.Text.Encoding.UTF8,
            "application/json");

    [Fact]
    public async Task Analyze_GuestUser_ReturnsOkWithGenre()
    {
        var response = await _client.PostAsync("/api/hum/analyze", ValidBody());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrEmpty(json.GetProperty("detectedGenre").GetString()));
    }

    [Fact]
    public async Task Analyze_ZeroDuration_ReturnsBadRequest()
    {
        var body = new StringContent(
            JsonSerializer.Serialize(new
            {
                audioBase64 = Convert.ToBase64String(new byte[200]),
                durationSeconds = 0.0,
                userId = (string?)null
            }),
            System.Text.Encoding.UTF8,
            "application/json");

        var response = await _client.PostAsync("/api/hum/analyze", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Analyze_RateLimiting_BlocksSixthRequest()
    {
        // 5 requests are within the StrictSlidingPolicy permit limit
        for (int i = 0; i < 5; i++)
        {
            var response = await _client.PostAsync("/api/hum/analyze", ValidBody());
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        // The 6th request exceeds the limit and must be rejected
        var blocked = await _client.PostAsync("/api/hum/analyze", ValidBody());
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
    }
}
