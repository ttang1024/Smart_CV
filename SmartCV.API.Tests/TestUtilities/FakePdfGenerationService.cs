using System.Text;
using SmartCV.API.Services;

namespace SmartCV.API.Tests.TestUtilities;

/// <summary>
/// Stands in for the real Puppeteer/Chromium-backed service in integration tests, so
/// hitting /api/pdf/generate never launches a browser or touches the network.
/// </summary>
public sealed class FakePdfGenerationService : IPdfGenerationService
{
    public string? LastHtml { get; private set; }

    public Task<byte[]> GenerateAsync(string html)
    {
        LastHtml = html;
        return Task.FromResult(Encoding.UTF8.GetBytes($"%PDF-FAKE% {html.Length} bytes of html"));
    }
}
