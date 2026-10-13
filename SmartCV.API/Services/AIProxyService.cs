using SmartCV.API.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace SmartCV.API.Services;

/// <summary>
/// Relays a chat request to the user's chosen AI provider using the user's own API key.
/// The proxy exists to sidestep browser CORS restrictions on provider APIs; it does not
/// store keys, and it never logs request or response bodies (they contain resume PII).
/// </summary>
public partial class AIProxyService(IHttpClientFactory httpClientFactory, ILogger<AIProxyService> logger)
{
    public const string HttpClientName = "ai-provider";

    private const int DefaultMaxTokens = 4096;
    private const int MaxMessages = 100;
    private const int MaxTotalContentChars = 400_000;
    private const int MaxErrorMessageChars = 500;

    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase) { "system", "user", "assistant" };

    // Statuses worth surfacing to the user as-is (bad key, quota, bad model...). Anything
    // else — usually an upstream 5xx — is reported as a gateway error.
    private static readonly HashSet<int> PassThroughStatuses = [400, 401, 403, 404, 413, 422, 429];

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    // Model ids are interpolated into the Gemini URL path, so they must not contain '/',
    // '?' or '#'. Every provider's real model ids fit this shape.
    [GeneratedRegex(@"^[A-Za-z0-9][A-Za-z0-9._:\-]{0,127}$")]
    private static partial Regex ModelIdRx();

    public async Task<IResult> ProxyAsync(AIProxyRequest request, CancellationToken ct)
    {
        if (!AiProviders.TryGet(request.Provider, out var provider))
            return Error(StatusCodes.Status400BadRequest, $"Unknown provider: {request.Provider}");

        var validationError = Validate(request);
        if (validationError is not null)
            return Error(StatusCodes.Status400BadRequest, validationError);

        var messages = WithResponseLanguageInstruction(request);
        using var upstreamRequest = provider.Kind switch
        {
            AiProviderKind.Claude => BuildClaudeRequest(provider, request, messages),
            AiProviderKind.Gemini => BuildGeminiRequest(provider, request, messages),
            _ => BuildOpenAICompatibleRequest(provider, request, messages),
        };

        HttpResponseMessage response;
        try
        {
            var client = httpClientFactory.CreateClient(HttpClientName);
            response = await client.SendAsync(upstreamRequest, ct);
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning("AI provider {Provider} timed out", provider.Id);
            return Error(StatusCodes.Status504GatewayTimeout, "The AI provider took too long to respond.");
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning("AI provider {Provider} unreachable: {Error}", provider.Id, ex.Message);
            return Error(StatusCodes.Status502BadGateway, "Could not reach the AI provider.");
        }

        using (response)
        {
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                var status = (int)response.StatusCode;
                logger.LogWarning("AI provider {Provider} returned {Status}", provider.Id, status);
                return Error(
                    PassThroughStatuses.Contains(status) ? status : StatusCodes.Status502BadGateway,
                    ExtractUpstreamErrorMessage(body) ?? $"The AI provider returned an error ({status}).");
            }

            var content = ExtractContent(provider.Kind, body, out var failureReason);
            if (content is null)
            {
                logger.LogWarning("AI provider {Provider} returned an unusable response: {Reason}", provider.Id, failureReason);
                return Error(StatusCodes.Status502BadGateway, failureReason);
            }

            return Results.Ok(new { content, provider = provider.Id, model = request.Model });
        }
    }

    private static string? Validate(AIProxyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ApiKey) || request.ApiKey.Length > 512 || request.ApiKey.Any(char.IsControl))
            return "A valid API key is required.";
        if (string.IsNullOrWhiteSpace(request.Model) || !ModelIdRx().IsMatch(request.Model))
            return "Invalid model id.";
        if (request.Messages is null || request.Messages.Count == 0 || request.Messages.Count > MaxMessages)
            return $"Between 1 and {MaxMessages} messages are required.";
        if (request.Messages.Any(m => m is null || !AllowedRoles.Contains(m.Role ?? "") || m.Content is null))
            return "Each message needs a role of system, user or assistant and a content string.";
        if (request.Messages.Sum(m => (long)m.Content.Length) > MaxTotalContentChars)
            return "The request is too large.";
        if (request.Temperature is < 0 or > 2)
            return "Temperature must be between 0 and 2.";
        if (request.MaxTokens is < 1 or > 32_000)
            return "maxTokens must be between 1 and 32000.";
        return null;
    }

    // ── Request builders ──────────────────────────────────────────────────────

    private static HttpRequestMessage BuildOpenAICompatibleRequest(
        AiProviderDefinition provider, AIProxyRequest request, List<AIMessage> messages)
    {
        var message = JsonPost(provider.Endpoint, new
        {
            model = request.Model,
            messages = messages.Select(m => new { role = m.Role.ToLowerInvariant(), content = m.Content }),
            temperature = request.Temperature,
            max_tokens = request.MaxTokens,
            stream = false
        });
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", request.ApiKey);
        return message;
    }

    private static HttpRequestMessage BuildClaudeRequest(
        AiProviderDefinition provider, AIProxyRequest request, List<AIMessage> messages)
    {
        var message = JsonPost(provider.Endpoint, new
        {
            model = request.Model,
            max_tokens = request.MaxTokens ?? DefaultMaxTokens,
            system = CombineSystemMessages(messages),
            messages = messages
                .Where(m => !IsSystemMessage(m))
                .Select(m => new { role = m.Role.ToLowerInvariant(), content = m.Content })
        });
        message.Headers.Add("x-api-key", request.ApiKey);
        message.Headers.Add("anthropic-version", "2023-06-01");
        return message;
    }

    private static HttpRequestMessage BuildGeminiRequest(
        AiProviderDefinition provider, AIProxyRequest request, List<AIMessage> messages)
    {
        var systemMsg = CombineSystemMessages(messages);
        var message = JsonPost(provider.Endpoint.Replace("{model}", request.Model), new
        {
            system_instruction = systemMsg is null ? null : new { parts = new[] { new { text = systemMsg } } },
            contents = messages
                .Where(m => !IsSystemMessage(m))
                .Select(m => new
                {
                    role = string.Equals(m.Role, "assistant", StringComparison.OrdinalIgnoreCase) ? "model" : "user",
                    parts = new[] { new { text = m.Content } }
                }),
            generationConfig = new { temperature = request.Temperature, maxOutputTokens = request.MaxTokens }
        });
        // Header, not ?key= — query strings end up in proxy and access logs.
        message.Headers.Add("x-goog-api-key", request.ApiKey);
        return message;
    }

    private static HttpRequestMessage JsonPost(string url, object body) => new(HttpMethod.Post, url)
    {
        Content = new StringContent(JsonSerializer.Serialize(body, JsonOptions), Encoding.UTF8, "application/json")
    };

    // ── Response handling ─────────────────────────────────────────────────────

    private static string? ExtractContent(AiProviderKind kind, string body, out string failureReason)
    {
        failureReason = "The AI provider returned an unexpected response.";
        JsonDocument doc;
        try { doc = JsonDocument.Parse(body); }
        catch (JsonException) { return null; }

        using (doc)
        {
            var root = doc.RootElement;
            switch (kind)
            {
                case AiProviderKind.Claude:
                    if (!root.TryGetProperty("content", out var blocks) || blocks.ValueKind != JsonValueKind.Array)
                        return null;
                    var text = string.Concat(blocks.EnumerateArray()
                        .Where(b => b.TryGetProperty("type", out var t) ? t.GetString() == "text" : b.TryGetProperty("text", out _))
                        .Select(b => b.TryGetProperty("text", out var v) ? v.GetString() : null));
                    if (text.Length == 0) failureReason = "The AI provider returned no text.";
                    return text.Length == 0 ? null : text;

                case AiProviderKind.Gemini:
                    if (!root.TryGetProperty("candidates", out var candidates)
                        || candidates.ValueKind != JsonValueKind.Array || candidates.GetArrayLength() == 0)
                    {
                        var blockReason = root.TryGetProperty("promptFeedback", out var fb) && fb.TryGetProperty("blockReason", out var br)
                            ? br.GetString() : null;
                        failureReason = blockReason is null
                            ? "The AI provider returned no content."
                            : $"The AI provider blocked this request ({blockReason}).";
                        return null;
                    }
                    var candidate = candidates[0];
                    if (!candidate.TryGetProperty("content", out var gContent) || !gContent.TryGetProperty("parts", out var parts))
                    {
                        var finish = candidate.TryGetProperty("finishReason", out var fr) ? fr.GetString() : null;
                        failureReason = $"The AI provider returned no content{(finish is null ? "" : $" (finish reason: {finish})")}.";
                        return null;
                    }
                    return string.Concat(parts.EnumerateArray()
                        .Select(p => p.TryGetProperty("text", out var v) ? v.GetString() : null));

                default:
                    if (root.TryGetProperty("choices", out var choices)
                        && choices.ValueKind == JsonValueKind.Array && choices.GetArrayLength() > 0
                        && choices[0].TryGetProperty("message", out var msg)
                        && msg.TryGetProperty("content", out var c)
                        && c.ValueKind == JsonValueKind.String)
                    {
                        return c.GetString();
                    }
                    return null;
            }
        }
    }

    /// <summary>
    /// Pull a human-readable message out of a provider error body. OpenAI-compatible APIs,
    /// Anthropic and Gemini all use { "error": { "message": ... } }; a few return a string.
    /// </summary>
    internal static string? ExtractUpstreamErrorMessage(string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return null;
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            string? message = null;
            if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("error", out var error))
            {
                message = error.ValueKind switch
                {
                    JsonValueKind.String => error.GetString(),
                    JsonValueKind.Object when error.TryGetProperty("message", out var m) => m.GetString(),
                    _ => null
                };
            }
            else if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("message", out var topLevel))
            {
                message = topLevel.GetString();
            }

            return string.IsNullOrWhiteSpace(message) ? null : Truncate(message);
        }
        catch (JsonException)
        {
            // Plain-text error bodies are often HTML error pages; only keep short ones.
            return body.Length <= 200 && !body.TrimStart().StartsWith('<') ? body.Trim() : null;
        }
    }

    private static string Truncate(string value) =>
        value.Length <= MaxErrorMessageChars ? value : value[..MaxErrorMessageChars] + "…";

    private static IResult Error(int status, string message) =>
        Results.Json(new { error = message }, statusCode: status);

    // ── Prompt shaping ────────────────────────────────────────────────────────

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
