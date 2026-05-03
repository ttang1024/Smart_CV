using SmartCV.API.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SmartCV.API.Services;

public class AIProxyService(IHttpClientFactory httpClientFactory, ILogger<AIProxyService> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public async Task<IResult> ProxyAsync(AIProxyRequest request, CancellationToken ct)
    {
        return request.Provider.ToLowerInvariant() switch
        {
            "openai" => await ProxyOpenAICompatibleAsync(
                "https://api.openai.com/v1/chat/completions",
                request, ct),
            "grok" => await ProxyOpenAICompatibleAsync(
                "https://api.x.ai/v1/chat/completions",
                request, ct),
            "qianwen" => await ProxyOpenAICompatibleAsync(
                "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                request, ct),
            "kimi" => await ProxyOpenAICompatibleAsync(
                "https://api.moonshot.cn/v1/chat/completions",
                request, ct),
            "doubao" => await ProxyOpenAICompatibleAsync(
                "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
                request, ct),
            "wenyanyixin" => await ProxyOpenAICompatibleAsync(
                "https://qianfan.baidubce.com/v2/chat/completions",
                request, ct),
            "claude" => await ProxyClaudeAsync(request, ct),
            "gemini" => await ProxyGeminiAsync(request, ct),
            _ => Results.BadRequest(new { error = $"Unknown provider: {request.Provider}" })
        };
    }

    private async Task<IResult> ProxyOpenAICompatibleAsync(string url, AIProxyRequest request, CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", request.ApiKey);
        var messages = WithResponseLanguageInstruction(request);

        var body = new
        {
            model = request.Model,
            messages = messages.Select(m => new { role = m.Role, content = m.Content }),
            temperature = request.Temperature,
            stream = false
        };

        var json = JsonSerializer.Serialize(body, JsonOptions);
        var response = await client.PostAsync(url,
            new StringContent(json, Encoding.UTF8, "application/json"), ct);

        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning("AI provider {Provider} returned {Status}: {Body}", request.Provider, response.StatusCode, errBody);
            return Results.Problem(errBody, statusCode: (int)response.StatusCode);
        }

        var responseBody = await response.Content.ReadAsStringAsync(ct);
        var doc = JsonDocument.Parse(responseBody);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "";

        return Results.Ok(new { content, provider = request.Provider, model = request.Model });
    }

    private async Task<IResult> ProxyClaudeAsync(AIProxyRequest request, CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("x-api-key", request.ApiKey);
        client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
        var messages = WithResponseLanguageInstruction(request);

        var systemMsg = CombineSystemMessages(messages);
        var userMessages = messages
            .Where(m => !IsSystemMessage(m))
            .Select(m => new { role = m.Role, content = m.Content })
            .ToList();

        var body = new Dictionary<string, object>
        {
            ["model"] = request.Model,
            ["max_tokens"] = 4096,
            ["messages"] = userMessages
        };
        if (systemMsg is not null) body["system"] = systemMsg;

        var json = JsonSerializer.Serialize(body, JsonOptions);
        var response = await client.PostAsync("https://api.anthropic.com/v1/messages",
            new StringContent(json, Encoding.UTF8, "application/json"), ct);

        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning("Claude returned {Status}: {Body}", response.StatusCode, errBody);
            return Results.Problem(errBody, statusCode: (int)response.StatusCode);
        }

        var responseBody = await response.Content.ReadAsStringAsync(ct);
        var doc = JsonDocument.Parse(responseBody);
        var content = doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? "";

        return Results.Ok(new { content, provider = "claude", model = request.Model });
    }

    private async Task<IResult> ProxyGeminiAsync(AIProxyRequest request, CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient();
        var model = request.Model;
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={request.ApiKey}";
        var messages = WithResponseLanguageInstruction(request);

        var contents = messages
            .Where(m => !IsSystemMessage(m))
            .Select(m => new
            {
                role = m.Role == "assistant" ? "model" : "user",
                parts = new[] { new { text = m.Content } }
            })
            .ToList();

        var systemMsg = CombineSystemMessages(messages);
        object body;
        if (systemMsg is not null)
        {
            body = new
            {
                system_instruction = new { parts = new[] { new { text = systemMsg } } },
                contents,
                generationConfig = new { temperature = request.Temperature }
            };
        }
        else
        {
            body = new
            {
                contents,
                generationConfig = new { temperature = request.Temperature }
            };
        }

        var json = JsonSerializer.Serialize(body, JsonOptions);
        var response = await client.PostAsync(url,
            new StringContent(json, Encoding.UTF8, "application/json"), ct);

        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning("Gemini returned {Status}: {Body}", response.StatusCode, errBody);
            return Results.Problem(errBody, statusCode: (int)response.StatusCode);
        }

        var responseBody = await response.Content.ReadAsStringAsync(ct);
        var doc = JsonDocument.Parse(responseBody);
        var content = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? "";

        return Results.Ok(new { content, provider = "gemini", model = request.Model });
    }

    private static List<AIMessage> WithResponseLanguageInstruction(AIProxyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ResponseLanguage))
        {
            return request.Messages;
        }

        var instruction =
            $"Respond in {request.ResponseLanguage}. " +
            "Keep code, identifiers, technical terms, proper nouns, JSON keys, and required schemas unchanged. " +
            "For JSON responses, translate only human-readable string values.";
        var messages = request.Messages.ToList();
        var systemMessageIndex = messages.FindIndex(IsSystemMessage);

        if (systemMessageIndex >= 0)
        {
            var existing = messages[systemMessageIndex];
            messages[systemMessageIndex] = existing with
            {
                Content = $"{existing.Content}\n\n{instruction}"
            };
        }
        else
        {
            messages.Insert(0, new AIMessage("system", instruction));
        }

        return messages;
    }

    private static string? CombineSystemMessages(IEnumerable<AIMessage> messages)
    {
        var systemMessages = messages
            .Where(IsSystemMessage)
            .Select(m => m.Content)
            .Where(content => !string.IsNullOrWhiteSpace(content))
            .ToList();

        return systemMessages.Count == 0 ? null : string.Join("\n\n", systemMessages);
    }

    private static bool IsSystemMessage(AIMessage message)
    {
        return string.Equals(message.Role, "system", StringComparison.OrdinalIgnoreCase);
    }
}
