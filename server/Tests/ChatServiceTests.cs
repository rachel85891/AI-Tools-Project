using DTOs;
using Entities;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using Polly;
using Repositories;
using Services.Chat;
using System.Net;
using System.Net.Http;

namespace Test;

public class ChatServiceTests
{
    // ---------------------------------------------------------------------------
    // Constants & pipeline helpers
    // ---------------------------------------------------------------------------

    private const string ValidLlmJson =
        """{"choices":[{"message":{"content":"Here are the upcoming shows."}}]}""";

    /// <summary>
    /// Zero-delay retry-only pipeline so retry tests complete in milliseconds.
    /// Circuit breaker is intentionally omitted to keep call-count assertions deterministic.
    /// </summary>
    private static ResiliencePipeline<HttpResponseMessage> BuildFastRetryPipeline() =>
        new ResiliencePipelineBuilder<HttpResponseMessage>()
            .AddRetry(new Polly.Retry.RetryStrategyOptions<HttpResponseMessage>
            {
                MaxRetryAttempts = 3,
                Delay = TimeSpan.Zero,
                BackoffType = DelayBackoffType.Constant,
                UseJitter = false,
                ShouldHandle = new PredicateBuilder<HttpResponseMessage>()
                    .Handle<HttpRequestException>()
                    .HandleResult(r => (int)r.StatusCode >= 500)
            })
            .Build();

    // ---------------------------------------------------------------------------
    // Factory helpers
    // ---------------------------------------------------------------------------

    private static (Mock<IShowsRepository> shows, Mock<IOrderRepository> orders,
                    Mock<ILogger<ChatService>> logger, LLMOptions llmOptions)
        CreateMocks()
    {
        var shows = new Mock<IShowsRepository>();
        shows.Setup(r => r.getAllShows()).ReturnsAsync(new List<Show>());

        var orders = new Mock<IOrderRepository>();
        var logger = new Mock<ILogger<ChatService>>();

        var llmOptions = new LLMOptions { Model = "gpt-test", ApiKey = "test-key" };

        return (shows, orders, logger, llmOptions);
    }

    private static (Mock<HttpMessageHandler> handler, HttpClient client) CreateSuccessHttpClient()
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(ValidLlmJson)
            });

        var client = new HttpClient(handler.Object)
        {
            BaseAddress = new Uri("https://api.test.com")
        };

        return (handler, client);
    }

    // ---------------------------------------------------------------------------
    // Test 1 (required)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetChatResponseAsync_WithValidUserId_EnrichesSystemPromptWithUserOrders()
    {
        var (showsMock, ordersMock, loggerMock, llmOptions) = CreateMocks();
        var (_, httpClient) = CreateSuccessHttpClient();

        var sampleOrders = new List<Order>
        {
            new() { Id = 1, Price = 50.0, OrderDate = new DateTime(2024, 1, 10) },
            new() { Id = 2, Price = 75.0, OrderDate = new DateTime(2024, 1, 15) }
        };
        ordersMock.Setup(r => r.getOrdersForUser(42)).ReturnsAsync(sampleOrders);

        var service = new ChatService(
            showsMock.Object, ordersMock.Object,
            httpClient, loggerMock.Object, llmOptions,
            BuildFastRetryPipeline());

        var result = await service.GetChatResponseAsync(
            new ChatRequestDto("What did I book?"), "42", CancellationToken.None);

        ordersMock.Verify(r => r.getOrdersForUser(42), Times.Once);
        Assert.Equal(ChatResponseStatus.Success, result.Status);
        Assert.Equal("Here are the upcoming shows.", result.Response);
        Assert.True((DateTime.UtcNow - result.Timestamp).TotalSeconds < 5);
    }

    // ---------------------------------------------------------------------------
    // Test 2 (required)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetChatResponseAsync_WhenExternalApiFails_TriggersPollyRetryAndReturnsGracefulFallback()
    {
        var (showsMock, ordersMock, loggerMock, llmOptions) = CreateMocks();

        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Connection refused"));

        var httpClient = new HttpClient(handler.Object)
        {
            BaseAddress = new Uri("https://api.test.com")
        };

        var service = new ChatService(
            showsMock.Object, ordersMock.Object,
            httpClient, loggerMock.Object, llmOptions,
            BuildFastRetryPipeline());

        var result = await service.GetChatResponseAsync(
            new ChatRequestDto("Hello"), null, CancellationToken.None);

        // Verify Polly retried: 1 initial attempt + 3 retries = 4 total calls
        handler.Protected().Verify(
            "SendAsync",
            Times.Exactly(4),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());

        Assert.Equal(ChatResponseStatus.Fallback, result.Status);
        Assert.Contains("could not process", result.Response, StringComparison.OrdinalIgnoreCase);

        loggerMock.Verify(
            l => l.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    // ---------------------------------------------------------------------------
    // Test 3
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetChatResponseAsync_WithNullUserId_DoesNotQueryOrderRepository()
    {
        var (showsMock, ordersMock, loggerMock, llmOptions) = CreateMocks();
        var (_, httpClient) = CreateSuccessHttpClient();

        var service = new ChatService(
            showsMock.Object, ordersMock.Object,
            httpClient, loggerMock.Object, llmOptions,
            BuildFastRetryPipeline());

        var result = await service.GetChatResponseAsync(
            new ChatRequestDto("What shows are on?"), null, CancellationToken.None);

        ordersMock.Verify(r => r.getOrdersForUser(It.IsAny<int>()), Times.Never);
        Assert.Equal(ChatResponseStatus.Success, result.Status);
    }

    // ---------------------------------------------------------------------------
    // Test 4
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetChatResponseAsync_WithConversationContext_IncludesHistoryInRequest()
    {
        var (showsMock, ordersMock, loggerMock, llmOptions) = CreateMocks();

        string capturedBody = string.Empty;
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>(async (req, ct) =>
            {
                capturedBody = await req.Content!.ReadAsStringAsync(ct);
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(ValidLlmJson)
                };
            });

        var httpClient = new HttpClient(handler.Object)
        {
            BaseAddress = new Uri("https://api.test.com")
        };

        var context = new List<ChatMessageDto>
        {
            new("user", "Prior msg"),
            new("assistant", "Prior reply")
        };

        var service = new ChatService(
            showsMock.Object, ordersMock.Object,
            httpClient, loggerMock.Object, llmOptions,
            BuildFastRetryPipeline());

        var result = await service.GetChatResponseAsync(
            new ChatRequestDto("Follow-up question", context), null, CancellationToken.None);

        Assert.Equal(ChatResponseStatus.Success, result.Status);
        Assert.Contains("\"role\":\"user\"", capturedBody);
        Assert.Contains("\"role\":\"assistant\"", capturedBody);
        Assert.Contains("Prior msg", capturedBody);
        Assert.Contains("Prior reply", capturedBody);
    }
}
