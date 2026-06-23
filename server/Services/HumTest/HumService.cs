using System.Text.Json;
using DTOs;
using Entities;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;
using Repositories;

namespace Services.HumTest;

public class HumService : IHumService
{
    private readonly IHumRepository _humRepo;
    private readonly IShowsRepository _showsRepo;
    private readonly IAIAudioAnalyzer _analyzer;
    private readonly IKafkaProducerService _kafka;
    private readonly HybridCache _cache;
    private readonly ILogger<HumService> _logger;
    private readonly IEnumerable<IHumEventObserver> _observers;

    private static readonly Dictionary<string, string> GenreKeywords =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Rock"] = "Concert",
            ["Classical"] = "Orchestra",
            ["Jazz"] = "Jazz",
            ["Pop"] = "Music",
            ["Electronic"] = "Club",
            ["Hip-Hop"] = "Hip-Hop",
            ["Folk"] = "Folk",
            ["R&B"] = "R&B",
            ["Metal"] = "Metal",
            ["Country"] = "Country"
        };

    public HumService(
        IHumRepository humRepo,
        IShowsRepository showsRepo,
        IAIAudioAnalyzer analyzer,
        IKafkaProducerService kafka,
        HybridCache cache,
        ILogger<HumService> logger,
        IEnumerable<IHumEventObserver> observers)
    {
        _humRepo = humRepo;
        _showsRepo = showsRepo;
        _analyzer = analyzer;
        _kafka = kafka;
        _cache = cache;
        _logger = logger;
        _observers = observers;
    }

    public async Task<HumSessionResponseDto> AnalyzeAndRecommendAsync(
        HumSessionCreateDto dto, CancellationToken ct = default)
    {
        // 1. Run validation chain
        var validator = new AudioValidationHandler();
        validator.SetNext(new DurationCheckHandler()).SetNext(new FormatCheckHandler());
        await validator.HandleAsync(dto);

        // 2. Save session as Pending
        var session = await _humRepo.SaveSessionAsync(new HumSession
        {
            UserId = dto.UserId,
            AudioDurationSeconds = dto.DurationSeconds,
            CreatedAt = DateTime.UtcNow,
            SessionStatus = HumSessionStatus.Pending
        });

        // 3. Analyse audio via injected analyzer (Claude or Mock)
        var analysis = await _analyzer.AnalyzeAudioAsync(dto.AudioBase64, dto.DurationSeconds);

        // 4. Query shows matching the detected genre
        var keyword = GenreKeywords.GetValueOrDefault(analysis.Genre, analysis.Genre);
        var filter = new ShowFilterDTO { description = keyword, skip = 5, position = 1 };
        var (shows, _) = await _showsRepo.getAllShows(filter);
        var summaries = shows
            .Select(s => new ShowSummaryDto(
                s.Id,
                s.Title,
                s.Date,
                s.ImgUrl ?? string.Empty,
                s.Category?.Name ?? string.Empty))
            .ToList();

        // 5. Update session to Completed
        session.DetectedGenre = analysis.Genre;
        session.ConfidenceScore = analysis.Confidence;
        session.RecommendedShowIds = JsonSerializer.Serialize(summaries.Select(s => s.Id));
        session.SessionStatus = HumSessionStatus.Completed;
        session.RawTranscription = dto.AudioBase64[..Math.Min(200, dto.AudioBase64.Length)];
        await _humRepo.UpdateSessionAsync(session);

        // 6. Notify observers (errors swallowed individually)
        foreach (var observer in _observers)
        {
            try { await observer.OnAnalysisCompletedAsync(session, analysis, ct); }
            catch (Exception ex) { _logger.LogError(ex, "Observer {Observer} failed", observer.GetType().Name); }
        }

        // 8. Publish Kafka event (errors are swallowed — must not break the main flow)
        try
        {
            var evt = JsonSerializer.Serialize(
                new { sessionId = session.Id, genre = analysis.Genre, userId = dto.UserId },
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            await _kafka.SendMessageAsync("hum-sessions", evt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kafka publish failed for hum-session {SessionId}", session.Id);
        }

        // 9. Cache result and return
        var response = new HumSessionResponseDto(session.Id, analysis.Genre, analysis.Confidence, summaries);
        await _cache.SetAsync(
            "hum:" + session.Id,
            response,
            new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(5) },
            cancellationToken: ct);

        return response;
    }
}
