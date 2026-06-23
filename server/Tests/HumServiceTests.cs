using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using DTOs;
using Entities;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;
using Moq;
using Repositories;
using Services;
using Services.HumTest;

namespace Tests;

public class HumServiceTests : IAsyncLifetime, IDisposable
{
    private Mock<IHumRepository> _mockHumRepo = null!;
    private Mock<IShowsRepository> _mockShowsRepo = null!;
    private Mock<IAIAudioAnalyzer> _mockAnalyzer = null!;
    private Mock<IKafkaProducerService> _mockKafka = null!;
    private Mock<ILogger<HumService>> _mockLogger = null!;
    private HumService _service = null!;

    // Concrete no-op HybridCache to avoid mocking abstract generic methods
    private sealed class NoOpHybridCache : HybridCache
    {
        public override ValueTask<T> GetOrCreateAsync<TState, T>(
            string key, TState state,
            Func<TState, CancellationToken, ValueTask<T>> factory,
            HybridCacheEntryOptions? options = null,
            IEnumerable<string>? tags = null,
            CancellationToken cancellationToken = default)
            => factory(state, cancellationToken);

        public override ValueTask SetAsync<T>(
            string key, T value,
            HybridCacheEntryOptions? options = null,
            IEnumerable<string>? tags = null,
            CancellationToken cancellationToken = default)
            => ValueTask.CompletedTask;

        public override ValueTask RemoveAsync(
            string key,
            CancellationToken cancellationToken = default)
            => ValueTask.CompletedTask;

        public override ValueTask RemoveByTagAsync(
            string tag,
            CancellationToken cancellationToken = default)
            => ValueTask.CompletedTask;
    }

    public Task InitializeAsync()
    {
        _mockHumRepo = new Mock<IHumRepository>();
        _mockShowsRepo = new Mock<IShowsRepository>();
        _mockAnalyzer = new Mock<IAIAudioAnalyzer>();
        _mockKafka = new Mock<IKafkaProducerService>();
        _mockLogger = new Mock<ILogger<HumService>>();

        var savedSession = new HumSession { Id = Guid.NewGuid() };

        _mockHumRepo
            .Setup(r => r.SaveSessionAsync(It.IsAny<HumSession>()))
            .ReturnsAsync(savedSession);

        _mockHumRepo
            .Setup(r => r.UpdateSessionAsync(It.IsAny<HumSession>()))
            .ReturnsAsync((HumSession s) => s);

        var emptyShows = (IEnumerable<Show>)new List<Show>();
        _mockShowsRepo
            .Setup(r => r.getAllShows(It.IsAny<ShowFilterDTO>()))
            .Returns(Task.FromResult((emptyShows, 0)));

        _mockAnalyzer
            .Setup(a => a.AnalyzeAudioAsync(It.IsAny<string>(), It.IsAny<double>()))
            .ReturnsAsync(new GenreAnalysisDto("Rock", 0.85, new List<string>(), "Energetic"));

        _mockKafka
            .Setup(k => k.SendMessageAsync(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        _service = new HumService(
            _mockHumRepo.Object,
            _mockShowsRepo.Object,
            _mockAnalyzer.Object,
            _mockKafka.Object,
            new NoOpHybridCache(),
            _mockLogger.Object,
            Array.Empty<IHumEventObserver>());

        return Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        _service = null!;
        return Task.CompletedTask;
    }

    public void Dispose() { }

    private static HumSessionCreateDto ValidDto() =>
        new(Convert.ToBase64String(new byte[200]), 5.0, null);

    [Fact]
    public async Task AnalyzeAndRecommend_ValidInput_ReturnsCorrectGenre()
    {
        var result = await _service.AnalyzeAndRecommendAsync(ValidDto());

        Assert.Equal("Rock", result.DetectedGenre);
    }

    [Fact]
    public async Task AnalyzeAndRecommend_ValidInput_PublishesKafkaEvent()
    {
        await _service.AnalyzeAndRecommendAsync(ValidDto());

        _mockKafka.Verify(k =>
            k.SendMessageAsync("hum-sessions", It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task AnalyzeAndRecommend_ValidInput_SavesThenUpdatesSession()
    {
        await _service.AnalyzeAndRecommendAsync(ValidDto());

        _mockHumRepo.Verify(r => r.SaveSessionAsync(It.IsAny<HumSession>()), Times.Once);
        _mockHumRepo.Verify(r => r.UpdateSessionAsync(It.IsAny<HumSession>()), Times.Once);
    }
}
