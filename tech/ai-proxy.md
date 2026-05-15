# AI Proxy Module

Routes AI chat requests from the browser to 9 different LLM providers through a single back-end endpoint, shielding API keys from direct browser exposure and normalizing the provider-specific wire formats into one unified response shape.

---

## Flow Chart

```mermaid
flowchart TD
    A([Component calls chatWithAI]) --> B[POST /api/ai/chat\nJSON body]
    B --> C[AIProxyService.ProxyAsync]
    C --> D{provider switch}

    D -- openai / grok / deepseek\nqianwen / kimi / doubao\nwenyanyixin --> E[ProxyOpenAICompatibleAsync\nBEARER token auth]
    D -- claude --> F[ProxyClaudeAsync\nx-api-key header]
    D -- gemini --> G[ProxyGeminiAsync\n?key= query param]
    D -- unknown --> H[400 Bad Request]

    E --> I[Inject ResponseLanguage\ninstruction into system message]
    F --> I
    G --> I

    I --> J[Forward to provider HTTPS endpoint]
    J --> K{HTTP 2xx?}
    K -- No --> L[Return Problem\nwith provider error body]
    K -- Yes --> M[Extract content string\nfrom provider JSON]
    M --> N[Return {content, provider, model}]
    N --> O([Component receives string])
```

---

## Front-End

### Components / Services

| File | Role |
|---|---|
| `SmartCV.Web/src/services/ai/aiService.ts` | `chatWithAI()` — single fetch call to proxy |
| `SmartCV.Web/src/components/ai/AIProviderSettings.tsx` | Settings UI for selecting provider, entering API keys, choosing model |
| `SmartCV.Web/src/components/ai/AIOptimizationPanel.tsx` | Calls `optimizeResume()` / `improveSection()` from `aiService.ts` |
| `SmartCV.Web/src/store/settingsStore.ts` | `getActiveConfig()` — resolves current provider + key + model |
| `SmartCV.Web/src/types/ai.ts` | `AIProviderType`, `AISettings`, provider configs |

### Interface Call Logic

```typescript
// aiService.ts — chatWithAI
export async function chatWithAI(request: ChatRequest): Promise<string> {
  const response = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: request.provider,
      apiKey: request.apiKey,
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      // Auto-inject UI language so AI replies in the same language as the UI
      responseLanguage: request.responseLanguage ?? getSelectedResponseLanguage(),
    }),
  });
  const data = await response.json();
  return data.content as string;
}
```

`API_BASE` resolves to:
- `process.env.NEXT_PUBLIC_API_URL` when set (production / Docker)
- `http://localhost:5167/api` when running on dev port 3000
- `/api` otherwise (same-origin)

### Response Language Injection

The UI language (from `i18next`) is sent as `responseLanguage`.  
The proxy appends an instruction to the system message so the model replies in that language while keeping JSON keys, code, and identifiers unchanged.

```typescript
// aiService.ts — getSelectedResponseLanguage
function getSelectedResponseLanguage(): string {
  const language = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const code = Object.keys(RESPONSE_LANGUAGE_NAMES).find(
    c => language === c || language.startsWith(`${c}-`)
  ) ?? 'en';
  return `${RESPONSE_LANGUAGE_NAMES[code]} (${code})`;   // e.g. "Simplified Chinese (zh-CN)"
}
```

---

## Back-End

**File:** `SmartCV.API/Services/AIProxyService.cs`  
**File:** `SmartCV.API/Models/AIProxyRequest.cs`

### API Endpoint

| Method | Path | Input | Output |
|---|---|---|---|
| `POST` | `/api/ai/chat` | `AIProxyRequest` JSON | `{ content, provider, model }` |
| `GET` | `/api/ai/health` | — | `{ status, timestamp }` |

```csharp
// Program.cs
var ai = app.MapGroup("/api/ai");
ai.MapPost("/chat", async (AIProxyRequest request, AIProxyService proxy, CancellationToken ct) =>
    await proxy.ProxyAsync(request, ct));
ai.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));
```

### Request Model

```csharp
// AIProxyRequest.cs
public record AIProxyRequest(
    string Provider,          // "openai" | "claude" | "gemini" | "grok" | "deepseek" | ...
    string ApiKey,
    string Model,
    List<AIMessage> Messages,
    double Temperature = 0.7,
    bool Stream = false,
    string? ResponseLanguage = null
);

public record AIMessage(string Role, string Content);
```

### Provider Routing

```csharp
// AIProxyService.cs — ProxyAsync
public async Task<IResult> ProxyAsync(AIProxyRequest request, CancellationToken ct)
{
    return request.Provider.ToLowerInvariant() switch
    {
        "openai"      => await ProxyOpenAICompatibleAsync("https://api.openai.com/v1/chat/completions", request, ct),
        "grok"        => await ProxyOpenAICompatibleAsync("https://api.x.ai/v1/chat/completions", request, ct),
        "deepseek"    => await ProxyOpenAICompatibleAsync("https://api.deepseek.com/chat/completions", request, ct),
        "qianwen"     => await ProxyOpenAICompatibleAsync("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", request, ct),
        "kimi"        => await ProxyOpenAICompatibleAsync("https://api.moonshot.cn/v1/chat/completions", request, ct),
        "doubao"      => await ProxyOpenAICompatibleAsync("https://ark.cn-beijing.volces.com/api/v3/chat/completions", request, ct),
        "wenyanyixin" => await ProxyOpenAICompatibleAsync("https://qianfan.baidubce.com/v2/chat/completions", request, ct),
        "claude"      => await ProxyClaudeAsync(request, ct),
        "gemini"      => await ProxyGeminiAsync(request, ct),
        _             => Results.BadRequest(new { error = $"Unknown provider: {request.Provider}" })
    };
}
```

### OpenAI-Compatible Providers (7 providers)

All share the same wire format. The `Bearer` token is the user's API key.

```csharp
// AIProxyService.cs — ProxyOpenAICompatibleAsync
private async Task<IResult> ProxyOpenAICompatibleAsync(string url, AIProxyRequest request, CancellationToken ct)
{
    var client = httpClientFactory.CreateClient();
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", request.ApiKey);

    var messages = WithResponseLanguageInstruction(request);  // inject lang instruction

    var body = new {
        model       = request.Model,
        messages    = messages.Select(m => new { role = m.Role, content = m.Content }),
        temperature = request.Temperature,
        stream      = false
    };

    var response = await client.PostAsync(url,
        new StringContent(JsonSerializer.Serialize(body, JsonOptions), Encoding.UTF8, "application/json"), ct);

    // Extract: choices[0].message.content
    var content = doc.RootElement
        .GetProperty("choices")[0]
        .GetProperty("message")
        .GetProperty("content").GetString() ?? "";

    return Results.Ok(new { content, provider = request.Provider, model = request.Model });
}
```

### Claude (Anthropic)

Uses the `x-api-key` header and `anthropic-version` header. System messages are extracted and placed in the top-level `system` field (Anthropic's format).

```csharp
// AIProxyService.cs — ProxyClaudeAsync
private async Task<IResult> ProxyClaudeAsync(AIProxyRequest request, CancellationToken ct)
{
    var client = httpClientFactory.CreateClient();
    client.DefaultRequestHeaders.Add("x-api-key", request.ApiKey);
    client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

    var messages = WithResponseLanguageInstruction(request);
    var systemMsg = CombineSystemMessages(messages);   // all system messages → single string
    var userMessages = messages.Where(m => !IsSystemMessage(m))
        .Select(m => new { role = m.Role, content = m.Content }).ToList();

    var body = new Dictionary<string, object> {
        ["model"]    = request.Model,
        ["max_tokens"] = 4096,
        ["messages"] = userMessages
    };
    if (systemMsg is not null) body["system"] = systemMsg;

    // POST https://api.anthropic.com/v1/messages
    // Extract: content[0].text
}
```

### Gemini (Google)

Uses API key as query parameter `?key=`. Maps `assistant` role to `model`. Places system instruction in `system_instruction.parts`.

```csharp
// AIProxyService.cs — ProxyGeminiAsync
private async Task<IResult> ProxyGeminiAsync(AIProxyRequest request, CancellationToken ct)
{
    var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={request.ApiKey}";

    var contents = messages.Where(m => !IsSystemMessage(m)).Select(m => new {
        role  = m.Role == "assistant" ? "model" : "user",
        parts = new[] { new { text = m.Content } }
    }).ToList();

    // system_instruction → { parts: [{ text: systemMsg }] }
    // Extract: candidates[0].content.parts[0].text
}
```

### Response Language Injection

```csharp
// AIProxyService.cs — WithResponseLanguageInstruction
private static List<AIMessage> WithResponseLanguageInstruction(AIProxyRequest request)
{
    if (string.IsNullOrWhiteSpace(request.ResponseLanguage))
        return request.Messages;

    var instruction =
        $"Respond in {request.ResponseLanguage}. " +
        "Keep code, identifiers, technical terms, proper nouns, JSON keys, and required schemas unchanged. " +
        "For JSON responses, translate only human-readable string values.";

    // Append to existing system message, or insert a new one at index 0
    var systemIdx = messages.FindIndex(IsSystemMessage);
    if (systemIdx >= 0)
        messages[systemIdx] = messages[systemIdx] with { Content = $"{...}\n\n{instruction}" };
    else
        messages.Insert(0, new AIMessage("system", instruction));
    return messages;
}
```

---

## Provider Comparison

| Provider | Auth | Base URL | Response path |
|---|---|---|---|
| OpenAI | `Authorization: Bearer` | `api.openai.com` | `choices[0].message.content` |
| Grok | `Authorization: Bearer` | `api.x.ai` | `choices[0].message.content` |
| DeepSeek | `Authorization: Bearer` | `api.deepseek.com` | `choices[0].message.content` |
| Qianwen | `Authorization: Bearer` | `dashscope.aliyuncs.com` | `choices[0].message.content` |
| Kimi | `Authorization: Bearer` | `api.moonshot.cn` | `choices[0].message.content` |
| Doubao | `Authorization: Bearer` | `ark.cn-beijing.volces.com` | `choices[0].message.content` |
| Wenyanyixin | `Authorization: Bearer` | `qianfan.baidubce.com` | `choices[0].message.content` |
| Claude | `x-api-key` | `api.anthropic.com` | `content[0].text` |
| Gemini | `?key=` query param | `generativelanguage.googleapis.com` | `candidates[0].content.parts[0].text` |
