using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using SmartCV.API.Tests.TestUtilities;

namespace SmartCV.API.Tests.Endpoints;

public class AiEndpointsTests
{
    [Fact]
    public async Task Health_ReturnsHealthyStatus()
    {
        using var factory = new SmartCvWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/ai/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("healthy", doc.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Chat_UnknownProvider_ReturnsBadRequest()
    {
        using var factory = new SmartCvWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/ai/chat", new
        {
            provider = "not-a-real-provider",
            apiKey = "key",
            model = "model",
            messages = new[] { new { role = "user", content = "Hi" } },
        });

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

        var response = await client.PostAsJsonAsync("/api/ai/chat", new
        {
            provider = "openai",
            apiKey = "key",
            model = "gpt-test",
            messages = new[] { new { role = "user", content = "Hi" } },
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Hello from the fake model", doc.RootElement.GetProperty("content").GetString());
        Assert.Equal("openai", doc.RootElement.GetProperty("provider").GetString());
    }
}
