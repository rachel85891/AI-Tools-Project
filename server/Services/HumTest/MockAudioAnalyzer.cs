using DTOs;

namespace Services.HumTest;

public class MockAudioAnalyzer : IAIAudioAnalyzer
{
    private static readonly string[] Genres = ["Rock", "Pop", "Jazz", "Classical", "Electronic"];
    private static readonly string[] Moods = ["Energetic", "Calm", "Happy", "Melancholic", "Intense"];

    public Task<GenreAnalysisDto> AnalyzeAudioAsync(string base64Audio, double durationSeconds)
    {
        int hash = Math.Abs(base64Audio[..Math.Min(50, base64Audio.Length)].GetHashCode());
        int index = hash % Genres.Length;
        var genre = Genres[index];
        var mood = Moods[index];
        var subGenres = new List<string> { genre + " Classic", genre + " Modern" };
        return Task.FromResult(new GenreAnalysisDto(genre, 0.75, subGenres, mood));
    }
}
