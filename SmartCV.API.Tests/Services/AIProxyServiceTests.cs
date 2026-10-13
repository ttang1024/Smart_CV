using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Logging.Abstractions;
using SmartCV.API.Models;
using SmartCV.API.Services;
using SmartCV.API.Tests.TestUtilities;

namespace SmartCV.API.Tests.Services;

// AIProxyService talks to eight different upstream chat-completion APIs. These tests never
// touch the network: FakeHttpClientFactory intercepts every outgoing request and returns a
// canned response, so we can assert exactly what SmartCV would have sent and how it maps
// each provider's response shape back to the common { content, provider, model } contract.
public class AIProxyServiceTests
{
    private static AIProxyRequest MakeRequest(string provider, string? responseLanguage = null, List<AIMessage>? messages = null) =>
        new(provider, "test-api-key", "test-model", messages ?? [new AIMessage("user", "Hello")], ResponseLanguage: responseLanguage);

    private static int? StatusCodeOf(IResult result) => (result as IStatusCodeHttpResult)?.StatusCode;

    private static T? ValueOf<T>(IResult result, string propertyName)
    {
        var value = (result as IValueHttpResult)?.Value;
        var prop = value?.GetType().GetProperty(propertyName);
        return prop is null ? default : (T?)prop.GetValue(value);
    }

    [Fact]
    public async Task ProxyAsync_UnknownProvider_ReturnsBadRequestWithoutCallingNetwork()
    {
        var factory = new FakeHttpClientFactory(_ => throw new InvalidOperationException("must not call network"));
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);

        var result = await service.ProxyAsync(MakeRequest("not-a-real-provider"), CancellationToken.None);

        Assert.Equal(400, StatusCodeOf(result));
    }

    [Fact]
    public async Task ProxyAsync_OpenAI_Success_ReturnsMappedContentAndSendsBearerAuth()
    {
        var factory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"choices":[{"message":{"content":"Hello there"}}]}""", Encoding.UTF8, "application/json"),
        });
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);

        var result = await service.ProxyAsync(MakeRequest("openai"), CancellationToken.None);

        Assert.Equal(200, StatusCodeOf(result));
        Assert.Equal("Hello there", ValueOf<string>(result, "content"));
        Assert.Equal("openai", ValueOf<string>(result, "provider"));

        var sent = Assert.Single(factory.Requests).Request;
        Assert.Equal("https://api.openai.com/v1/chat/completions", sent.RequestUri!.ToString());
        Assert.Equal("Bearer", sent.Headers.Authorization!.Scheme);
        Assert.Equal("test-api-key", sent.Headers.Authorization!.Parameter);
    }

    [Fact]
    public async Task ProxyAsync_OpenAI_UpstreamClientError_PassesStatusAndExtractsMessage()
    {
        var factory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.TooManyRequests)
        {
            Content = new StringContent("""{"error":{"message":"You exceeded your current quota","type":"insufficient_quota"}}""", Encoding.UTF8, "application/json"),
        });
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);

        var result = await service.ProxyAsync(MakeRequest("openai"), CancellationToken.None);

        Assert.Equal(429, StatusCodeOf(result));
        Assert.Equal("You exceeded your current quota", ValueOf<string>(result, "error"));
    }

    [Fact]
    public async Task ProxyAsync_UpstreamServerError_ReturnsBadGateway()
    {
        var factory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            Content = new StringContent("<html>upstream exploded</html>", Encoding.UTF8, "text/html"),
        });
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);

        var result = await service.ProxyAsync(MakeRequest("openai"), CancellationToken.None);

        Assert.Equal(502, StatusCodeOf(result));
        Assert.DoesNotContain("<html>", ValueOf<string>(result, "error"));
    }

    [Fact]
    public async Task ProxyAsync_UpstreamUnreachable_ReturnsBadGateway()
    {
        var factory = new FakeHttpClientFactory(_ => throw new HttpRequestException("connection refused"));
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);

        var result = await service.ProxyAsync(MakeRequest("openai"), CancellationToken.None);

        Assert.Equal(502, StatusCodeOf(result));
    }

    [Theory]
    [InlineData("""{"choices":[]}""")]
    [InlineData("""{"unexpected":true}""")]
    [InlineData("not json")]
    public async Task ProxyAsync_UnexpectedSuccessShape_ReturnsBadGatewayInsteadOfThrowing(string body)
    {
        var factory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        });
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);

        var result = await service.ProxyAsync(MakeRequest("openai"), CancellationToken.None);

        Assert.Equal(502, StatusCodeOf(result));
    }

    [Fact]
    public async Task ProxyAsync_GeminiBlockedPrompt_ReportsBlockReason()
    {
        var factory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"promptFeedback":{"blockReason":"SAFETY"}}""", Encoding.UTF8, "application/json"),
        });
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);

        var result = await service.ProxyAsync(MakeRequest("gemini"), CancellationToken.None);

        Assert.Equal(502, StatusCodeOf(result));
        Assert.Contains("SAFETY", ValueOf<string>(result, "error"));
    }

    [Theory]
    [InlineData("../../v1/files")]
    [InlineData("gemini-pro?alt=x")]
    [InlineData("model#frag")]
    [InlineData("")]
    public async Task ProxyAsync_InvalidModelId_IsRejectedWithoutCallingNetwork(string model)
    {
        var factory = new FakeHttpClientFactory(_ => throw new InvalidOperationException("must not call network"));
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);
        var request = new AIProxyRequest("gemini", "key", model, [new AIMessage("user", "Hi")]);

        var result = await service.ProxyAsync(request, CancellationToken.None);

        Assert.Equal(400, StatusCodeOf(result));
    }

    [Fact]
    public async Task ProxyAsync_InvalidRole_IsRejected()
    {
        var factory = new FakeHttpClientFactory(_ => throw new InvalidOperationException("must not call network"));
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);

        var result = await service.ProxyAsync(
            MakeRequest("openai", messages: [new AIMessage("tool", "Hi")]), CancellationToken.None);

        Assert.Equal(400, StatusCodeOf(result));
    }

    [Fact]
    public async Task ProxyAsync_ResponseLanguageSet_InsertsSystemInstructionWhenNoneExists()
    {
        var factory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"choices":[{"message":{"content":"ok"}}]}""", Encoding.UTF8, "application/json"),
        });
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);

        await service.ProxyAsync(MakeRequest("openai", responseLanguage: "Spanish"), CancellationToken.None);

        var body = Assert.Single(factory.Requests).Body!;
        using var doc = JsonDocument.Parse(body);
        var messages = doc.RootElement.GetProperty("messages").EnumerateArray().ToList();

        Assert.Equal("system", messages[0].GetProperty("role").GetString());
        Assert.Contains("Respond in Spanish", messages[0].GetProperty("content").GetString());
    }

    [Fact]
    public async Task ProxyAsync_Claude_Success_SeparatesSystemMessageFromConversation()
    {
        var factory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"content":[{"text":"Claude says hi"}]}""", Encoding.UTF8, "application/json"),
        });
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);
        var request = MakeRequest("claude", messages:
        [
            new AIMessage("system", "You are a helpful assistant."),
            new AIMessage("user", "Hi"),
        ]);

        var result = await service.ProxyAsync(request, CancellationToken.None);

        Assert.Equal(200, StatusCodeOf(result));
        Assert.Equal("Claude says hi", ValueOf<string>(result, "content"));

        var sent = Assert.Single(factory.Requests);
        Assert.Equal("test-api-key", sent.Request.Headers.GetValues("x-api-key").Single());
        using var doc = JsonDocument.Parse(sent.Body!);
        Assert.Equal("You are a helpful assistant.", doc.RootElement.GetProperty("system").GetString());
        var messages = doc.RootElement.GetProperty("messages").EnumerateArray().ToList();
        Assert.Single(messages);
        Assert.Equal("user", messages[0].GetProperty("role").GetString());
    }

    [Fact]
    public async Task ProxyAsync_Gemini_Success_MapsAssistantRoleToModelRole()
    {
        var factory = new FakeHttpClientFactory(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                """{"candidates":[{"content":{"parts":[{"text":"Gemini reply"}]}}]}""",
                Encoding.UTF8, "application/json"),
        });
        var service = new AIProxyService(factory, NullLogger<AIProxyService>.Instance);
        var request = MakeRequest("gemini", messages:
        [
            new AIMessage("user", "Hi"),
            new AIMessage("assistant", "Previous reply"),
        ]);

        var result = await service.ProxyAsync(request, CancellationToken.None);

        Assert.Equal(200, StatusCodeOf(result));
        Assert.Equal("Gemini reply", ValueOf<string>(result, "content"));

        var (sentRequest, sent) = Assert.Single(factory.Requests);
        Assert.DoesNotContain("key=", sentRequest.RequestUri!.Query);
        Assert.Equal("https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent", sentRequest.RequestUri.ToString());
        Assert.Equal("test-api-key", sentRequest.Headers.GetValues("x-goog-api-key").Single());
        using var doc = JsonDocument.Parse(sent!);
        var contents = doc.RootElement.GetProperty("contents").EnumerateArray().ToList();
        Assert.Equal("user", contents[0].GetProperty("role").GetString());
        Assert.Equal("model", contents[1].GetProperty("role").GetString());
    }
}
