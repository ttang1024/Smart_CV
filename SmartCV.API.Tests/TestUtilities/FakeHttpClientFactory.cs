using System.Net.Http;

namespace SmartCV.API.Tests.TestUtilities;

/// <summary>
/// Routes every outgoing HTTP call through a caller-supplied responder instead of the
/// network, so tests can exercise AIProxyService's provider-specific request/response
/// handling without ever calling a real AI provider.
/// </summary>
public sealed class FakeHttpClientFactory(Func<HttpRequestMessage, HttpResponseMessage> responder) : IHttpClientFactory
{
    public List<(HttpRequestMessage Request, string? Body)> Requests { get; } = [];

    public HttpClient CreateClient(string name) => new(new RecordingHandler(this, responder));

    private sealed class RecordingHandler(FakeHttpClientFactory owner, Func<HttpRequestMessage, HttpResponseMessage> responder)
        : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var body = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            owner.Requests.Add((request, body));
            return responder(request);
        }
    }
}
