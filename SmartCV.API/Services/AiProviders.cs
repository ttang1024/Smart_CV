namespace SmartCV.API.Services;

public enum AiProviderKind
{
    OpenAICompatible,
    Claude,
    Gemini,
}

public sealed record AiProviderDefinition(string Id, AiProviderKind Kind, string Endpoint);

/// <summary>
/// Single server-side source of truth for the upstream AI providers SmartCV can relay to.
/// The client picks a provider by id; the endpoint is never taken from the request.
/// </summary>
public static class AiProviders
{
    private static readonly Dictionary<string, AiProviderDefinition> ById = new AiProviderDefinition[]
    {
        new("openai", AiProviderKind.OpenAICompatible, "https://api.openai.com/v1/chat/completions"),
        new("grok", AiProviderKind.OpenAICompatible, "https://api.x.ai/v1/chat/completions"),
        new("deepseek", AiProviderKind.OpenAICompatible, "https://api.deepseek.com/chat/completions"),
        new("qianwen", AiProviderKind.OpenAICompatible, "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"),
        new("kimi", AiProviderKind.OpenAICompatible, "https://api.moonshot.cn/v1/chat/completions"),
        new("doubao", AiProviderKind.OpenAICompatible, "https://ark.cn-beijing.volces.com/api/v3/chat/completions"),
        new("wenyanyixin", AiProviderKind.OpenAICompatible, "https://qianfan.baidubce.com/v2/chat/completions"),
        new("claude", AiProviderKind.Claude, "https://api.anthropic.com/v1/messages"),
        // {model} is substituted after the model id has been validated (see AIProxyService).
        new("gemini", AiProviderKind.Gemini, "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"),
    }.ToDictionary(p => p.Id, StringComparer.OrdinalIgnoreCase);

    public static bool TryGet(string? id, out AiProviderDefinition provider)
    {
        if (id is not null && ById.TryGetValue(id, out var found))
        {
            provider = found;
            return true;
        }

        provider = null!;
        return false;
    }
}
