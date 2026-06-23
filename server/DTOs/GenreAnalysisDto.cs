namespace DTOs;

public record GenreAnalysisDto(string Genre, double Confidence, List<string> SubGenres, string Mood);
