namespace Entities;

public enum HumSessionStatus { Pending, Processing, Completed, Failed }

public class HumSession
{
    public Guid Id { get; set; }
    public string? UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public double AudioDurationSeconds { get; set; }
    public string DetectedGenre { get; set; } = string.Empty;
    public double ConfidenceScore { get; set; }
    public string RawTranscription { get; set; } = string.Empty;
    public string RecommendedShowIds { get; set; } = "[]";
    public HumSessionStatus SessionStatus { get; set; }
}
