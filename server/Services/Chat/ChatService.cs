using System.Text;
using System.Text.Json;
using DTOs;
using Entities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;
using Polly.CircuitBreaker;
using Repositories;

[assembly: System.Runtime.CompilerServices.InternalsVisibleTo("Tests")]

namespace Services.Chat;

public class ChatService : IChatService
{
    private readonly IShowsRepository _showsRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly HttpClient _httpClient;
    private readonly ILogger<ChatService> _logger;
    private readonly LLMOptions _llmOptions;
    private readonly ResiliencePipeline<HttpResponseMessage> _pipeline;

    public ChatService(
        IShowsRepository showsRepository,
        IOrderRepository orderRepository,
        IHttpClientFactory httpClientFactory,
        ILogger<ChatService> logger,
        IOptions<LLMOptions> llmOptions)
    {
        _showsRepository = showsRepository;
        _orderRepository = orderRepository;
        _httpClient = httpClientFactory.CreateClient("LlmClient");
        _logger = logger;
        _llmOptions = llmOptions.Value;
        _pipeline = BuildResiliencePipeline();
    }

    internal ChatService(
        IShowsRepository showsRepository,
        IOrderRepository orderRepository,
        HttpClient httpClient,
        ILogger<ChatService> logger,
        LLMOptions llmOptions,
        ResiliencePipeline<HttpResponseMessage> pipeline)
    {
        _showsRepository = showsRepository;
        _orderRepository = orderRepository;
        _httpClient = httpClient;
        _logger = logger;
        _llmOptions = llmOptions;
        _pipeline = pipeline;
    }

    public async Task<ChatResponseDto> GetChatResponseAsync(
        ChatRequestDto request,
        string? userId,
        CancellationToken cancellationToken)
    {
        try
        {
            string systemPrompt = await BuildSystemPromptAsync(userId, cancellationToken);
            var messages = BuildMessages(systemPrompt, request.Context, request.Message);

            string model = _llmOptions.Model;
            string jsonBody = JsonSerializer.Serialize(
                new { model, messages, temperature = 0.7 },
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

            HttpResponseMessage outcome = await _pipeline.ExecuteAsync(async ct =>
            {
                var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                return await _httpClient.PostAsync("/v1/chat/completions", content, ct);
            }, cancellationToken);

            outcome.EnsureSuccessStatusCode();

            string responseJson = await outcome.Content.ReadAsStringAsync(cancellationToken);
            string text = ExtractResponseText(responseJson);

            return new ChatResponseDto(text, DateTime.UtcNow, ChatResponseStatus.Success);
        }
        catch (BrokenCircuitException ex)
        {
            _logger.LogWarning(ex,
                "LLM circuit breaker is open. Returning fallback for userId={UserId}.", userId);
            return new ChatResponseDto(
                "The AI assistant is temporarily unavailable. Please try again shortly.",
                DateTime.UtcNow,
                ChatResponseStatus.Fallback);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Unexpected error calling LLM for userId={UserId}. UserMessage={UserMessage}",
                userId, request.Message);
            return new ChatResponseDto(
                "Sorry, I could not process your request at this time.",
                DateTime.UtcNow,
                ChatResponseStatus.Fallback);
        }
    }

    private async Task<string> BuildSystemPromptAsync(string? userId, CancellationToken cancellationToken)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are a helpful assistant for a theater ticket booking system.");
        sb.AppendLine("You have access to the following upcoming shows:");
        sb.AppendLine();

        List<Show> allShows = await _showsRepository.getAllShows();
        var shows = allShows.Take(20).ToList();

        if (shows.Count == 0)
        {
            sb.AppendLine("(No shows currently available.)");
        }
        else
        {
            foreach (var show in shows)
            {
                string categoryName = show.Category?.Name ?? "Uncategorized";
                sb.AppendLine(
                    $"- [{show.Id}] \"{show.Title}\" | Date: {show.Date:yyyy-MM-dd} | " +
                    $"Time: {show.BeginTime:HH\\:mm} | Category: {categoryName} | Sector: {show.Sector}");
            }
        }

        if (userId is not null && int.TryParse(userId, out int parsedUserId))
        {
            sb.AppendLine();
            sb.AppendLine("Booking history for this user:");
            List<Order> orders = await _orderRepository.getOrdersForUser(parsedUserId);

            if (orders.Count == 0)
            {
                sb.AppendLine("(No past bookings.)");
            }
            else
            {
                foreach (var order in orders.Take(10))
                {
                    sb.AppendLine(
                        $"- Order #{order.Id} | Date: {order.OrderDate:yyyy-MM-dd} | Total: {order.Price:F2}");
                }
            }
        }

        return sb.ToString();
    }

    private static List<object> BuildMessages(
        string systemPrompt,
        List<ChatMessageDto>? context,
        string userMessage)
    {
        var messages = new List<object>
        {
            new { role = "system", content = systemPrompt }
        };

        if (context is not null)
        {
            foreach (var msg in context)
                messages.Add(new { role = msg.Role, content = msg.Content });
        }

        messages.Add(new { role = "user", content = userMessage });
        return messages;
    }

    private static string ExtractResponseText(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString()
            ?? string.Empty;
    }

    private static ResiliencePipeline<HttpResponseMessage> BuildResiliencePipeline() =>
        new ResiliencePipelineBuilder<HttpResponseMessage>()
            .AddRetry(new Polly.Retry.RetryStrategyOptions<HttpResponseMessage>
            {
                MaxRetryAttempts = 3,
                Delay = TimeSpan.FromSeconds(1),
                BackoffType = DelayBackoffType.Exponential,
                UseJitter = true,
                ShouldHandle = new PredicateBuilder<HttpResponseMessage>()
                    .Handle<HttpRequestException>()
                    .HandleResult(r => (int)r.StatusCode >= 500)
            })
            .AddCircuitBreaker(new Polly.CircuitBreaker.CircuitBreakerStrategyOptions<HttpResponseMessage>
            {
                FailureRatio = 0.5,
                SamplingDuration = TimeSpan.FromSeconds(30),
                MinimumThroughput = 3,
                BreakDuration = TimeSpan.FromSeconds(30),
                ShouldHandle = new PredicateBuilder<HttpResponseMessage>()
                    .Handle<HttpRequestException>()
                    .HandleResult(r => (int)r.StatusCode >= 500)
            })
            .Build();
}
