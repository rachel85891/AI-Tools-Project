using System.Text;
using System.Text.Json;
using DTOs;
using Microsoft.Extensions.Logging;

namespace Services.HumTest;

public class ClaudeAudioAnalyzer : IAIAudioAnalyzer
{
    private const string Model = "claude-sonnet-4-6";
    private const string Endpoint = "/v1/chat/completions";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IEnumerable<IGenreStrategy> _strategies;
    private readonly ILogger<ClaudeAudioAnalyzer> _logger;

    public ClaudeAudioAnalyzer(
        IHttpClientFactory httpClientFactory,
        IEnumerable<IGenreStrategy> strategies,
        ILogger<ClaudeAudioAnalyzer> logger)
    {
        _httpClientFactory = httpClientFactory;
        _strategies = strategies;
        _logger = logger;
    }

    public async Task<GenreAnalysisDto> AnalyzeAudioAsync(string base64Audio, double durationSeconds)
    {
        var strategy = _strategies.FirstOrDefault(s => s.AppliesTo(durationSeconds))
            ?? _strategies.First();

        var audioSnippet = base64Audio[..Math.Min(500, base64Audio.Length)];
        var requestBody = JsonSerializer.Serialize(new
        {
            model = Model,
            messages = new object[]
            {
                new { role = "system", content = strategy.BuildSystemPrompt() },
                new { role = "user", content = $"Analyse this audio (base64 encoded): {audioSnippet}" }
            },
            temperature = 0.3
        }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        try
        {
            var client = _httpClientFactory.CreateClient("LlmClient");
            var httpResponse = await client.PostAsync(Endpoint,
                new StringContent(requestBody, Encoding.UTF8, "application/json"));
            httpResponse.EnsureSuccessStatusCode();

            var json = await httpResponse.Content.ReadAsStringAsync();
            return ParseAnalysisResponse(json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claude audio analysis failed for duration={Duration}s; returning Unknown genre", durationSeconds);
            return new GenreAnalysisDto("Unknown", 0, new List<string>(), "Unknown");
        }
    }

    private static GenreAnalysisDto ParseAnalysisResponse(string json)
    {
        try
        {
            using var outerDoc = JsonDocument.Parse(json);
            var content = outerDoc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "{}";

            using var innerDoc = JsonDocument.Parse(content);
            var root = innerDoc.RootElement;

            var genre = root.GetProperty("genre").GetString() ?? "Unknown";
            var confidence = root.GetProperty("confidence").GetDouble();
            var subGenres = root.GetProperty("subGenres")
                .EnumerateArray()
                .Select(e => e.GetString() ?? string.Empty)
                .ToList();
            var mood = root.GetProperty("mood").GetString() ?? "Unknown";

            return new GenreAnalysisDto(genre, confidence, subGenres, mood);
        }
        catch
        {
            return new GenreAnalysisDto("Unknown", 0, new List<string>(), "Unknown");
        }
    }
}
