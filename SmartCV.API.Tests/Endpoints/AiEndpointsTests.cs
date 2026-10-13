using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using SmartCV.API.Tests.TestUtilities;

namespace SmartCV.API.Tests.Endpoints;

public class AiEndpointsTests
{
    private static object ChatBody(string provider = "openai", string model = "gpt-test") => new
    {
        provider,
        apiKey = "key",
        model,
        messages = new[] { new { role = "user", content = "Hi" } },
    };

    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/ai/health")]
    public async Task Health_ReturnsHealthyStatus(string path)
    {
        using var factory = new SmartCvWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("healthy", doc.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Chat_UnknownProvider_ReturnsBadRequest()
    {
        using var factory = new SmartCvWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/ai/chat", ChatBody(provider: "not-a-real-provider"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Chat_OpenAiProvider_ReturnsContentFromFakeUpstream()
    {
        using var factory = new SmartCvWebApplicationFactory(
            _ => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"choices":[{"message":{"content":"Hello from the fake model"}}]}""", Encoding.UTF8, "application/json"),
            });
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/ai/chat", ChatBody());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Hello from the fake model", doc.RootElement.GetProperty("content").GetString());
        Assert.Equal("openai", doc.RootElement.GetProperty("provider").GetString());
    }

    [Fact]
    public async Task Chat_IsRateLimitedPerClient()
    {
        using var factory = new SmartCvWebApplicationFactory(
            _ => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"choices":[{"message":{"content":"ok"}}]}""", Encoding.UTF8, "application/json"),
            },
            new Dictionary<string, string?> { ["RateLimiting:AiPerMinute"] = "1" });
        using var client = factory.CreateClient();

        var first = await client.PostAsJsonAsync("/api/ai/chat", ChatBody());
        var second = await client.PostAsJsonAsync("/api/ai/chat", ChatBody());

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, second.StatusCode);
    }

    [Fact]
    public async Task Responses_CarrySecurityHeaders()
    {
        using var factory = new SmartCvWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        var csp = response.Headers.GetValues("Content-Security-Policy").Single();
        Assert.Contains("connect-src 'self'", csp);
        Assert.Contains("frame-ancestors 'none'", csp);
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
    }

    [Fact]
    public async Task UnknownApiRoute_ReturnsJsonNotFound()
    {
        using var factory = new SmartCvWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
    }
}
