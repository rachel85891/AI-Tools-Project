using DTOs;
using Entities;
using Microsoft.Extensions.Logging;

namespace Services.HumTest;

public class AnalyticsObserver : IHumEventObserver
{
    private readonly IRatingService _ratingService;
    private readonly ILogger<AnalyticsObserver> _logger;

    public AnalyticsObserver(IRatingService ratingService, ILogger<AnalyticsObserver> logger)
    {
        _ratingService = ratingService;
        _logger = logger;
    }

    public async Task OnAnalysisCompletedAsync(HumSession session, GenreAnalysisDto analysis, CancellationToken ct = default)
    {
        try
        {
            var rating = new Rating
            {
                Host = "HumTest",
                Method = "ANALYSE",
                Path = $"/hum-analytics/{analysis.Genre}",
                UserAgent = $"confidence={analysis.Confidence:0.00};mood={analysis.Mood}",
                Referer = session.UserId ?? "guest",
                RecordDate = DateTime.UtcNow
            };
            await _ratingService.AddRating(rating);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AnalyticsObserver failed for session {SessionId}", session.Id);
        }
    }
}
