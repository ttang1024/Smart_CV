namespace SmartCV.API.Models;

public record AIProxyRequest(
    string Provider,
    string ApiKey,
    string Model,
    List<AIMessage> Messages,
    double Temperature = 0.7,
    bool Stream = false,
    string? ResponseLanguage = null
);

public record AIMessage(string Role, string Content);

public enum AIProvider
{
    OpenAI,
    Gemini,
    Claude,
    Grok,
    Qianwen,
    Kimi,
    Doubao,
    Wenyanyixin
}
