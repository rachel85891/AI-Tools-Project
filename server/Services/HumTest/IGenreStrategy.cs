namespace Services.HumTest;

public interface IGenreStrategy
{
    bool AppliesTo(double durationSeconds);
    string BuildSystemPrompt();
    double MinConfidenceThreshold { get; }
}
