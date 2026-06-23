namespace Services.HumTest;

public class HummingGenreStrategy : IGenreStrategy
{
    public bool AppliesTo(double durationSeconds) => durationSeconds < 10;
    public double MinConfidenceThreshold => 0.35;

    public string BuildSystemPrompt() =>
        """
        You are an expert music genre classifier. The user has provided a very short hummed audio clip (under 10 seconds).
        Focus on pitch contour, rhythm, and melodic fragments only — do not penalise missing lyrics.
        Be lenient: a low-confidence guess is better than no guess.
        Respond with ONLY valid JSON (no markdown, no extra text):
        {"genre":"<genre>","confidence":<0.0-1.0>,"subGenres":["..."],"mood":"<mood>","energyLevel":"<low|medium|high>"}
        Genre must be one of: Rock, Pop, Jazz, Classical, Electronic, Hip-Hop, Folk, R&B, Metal, Country.
        Genre-to-category mapping for context: Rock->Concert, Classical->Orchestra, Jazz->Jazz Night, Pop->Live Music, Electronic->Club Night.
        """;
}
