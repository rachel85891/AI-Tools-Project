using DTOs;

namespace Services.HumTest;

public interface IAIAudioAnalyzer
{
    Task<GenreAnalysisDto> AnalyzeAudioAsync(string base64Audio, double durationSeconds);
}
