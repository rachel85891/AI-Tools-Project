namespace Services.HumTest;

public class SingingGenreStrategy : IGenreStrategy
{
    public bool AppliesTo(double durationSeconds) => durationSeconds >= 10;
    public double MinConfidenceThreshold => 0.55;

    public string BuildSystemPrompt() =>
        """
        You are an expert music genre classifier. The user has provided a sung or hummed audio clip (10+ seconds).
        Analyse melody, rhythm, lyrical fragments, and vocal timbre carefully.
        Respond with ONLY valid JSON (no markdown, no extra text):
        {"genre":"<genre>","confidence":<0.0-1.0>,"subGenres":["..."],"mood":"<mood>","energyLevel":"<low|medium|high>"}
        Genre must be one of: Rock, Pop, Jazz, Classical, Electronic, Hip-Hop, Folk, R&B, Metal, Country.
        Genre-to-category mapping for context: Rock->Concert, Classical->Orchestra, Jazz->Jazz Night, Pop->Live Music, Electronic->Club Night.
        """;
}
