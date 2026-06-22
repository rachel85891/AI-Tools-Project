namespace Services.Chat;

public class LLMOptions
{
    public const string SectionName = "LLM";
    public string BaseUrl { get; set; } = "https://api.openai.com";
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gpt-4o-mini";
}
