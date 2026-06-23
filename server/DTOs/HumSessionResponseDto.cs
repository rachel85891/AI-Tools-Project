namespace DTOs;

public record HumSessionResponseDto(
    Guid Id,
    string DetectedGenre,
    double ConfidenceScore,
    List<ShowSummaryDto> RecommendedShows
);
