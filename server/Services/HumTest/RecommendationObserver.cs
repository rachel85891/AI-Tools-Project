using System.Text.Json;
using DTOs;
using Entities;
using Microsoft.Extensions.Logging;

namespace Services.HumTest;

public class RecommendationObserver : IHumEventObserver
{
    private readonly ILogger<RecommendationObserver> _logger;

    public RecommendationObserver(ILogger<RecommendationObserver> logger)
    {
        _logger = logger;
    }

    public Task OnAnalysisCompletedAsync(HumSession session, GenreAnalysisDto analysis, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation(
                "RecommendationObserver: genre={Genre} confidence={Confidence:0.00} mood={Mood} showIds={ShowIds} userId={UserId}",
                analysis.Genre,
                analysis.Confidence,
                analysis.Mood,
                session.RecommendedShowIds,
                session.UserId ?? "guest");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RecommendationObserver failed for session {SessionId}", session.Id);
        }
        return Task.CompletedTask;
    }
}
