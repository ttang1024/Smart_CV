using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using SmartCV.API.Services;

namespace SmartCV.API.Tests.TestUtilities;

/// <summary>
/// Boots the real Minimal API pipeline for integration tests, but swaps out the two
/// dependencies that would otherwise reach outside the test process: the Puppeteer/Chromium
/// hosted service (PDF generation) and outbound HTTP to real AI providers.
/// </summary>
public sealed class SmartCvWebApplicationFactory : WebApplicationFactory<Program>
{
    public FakePdfGenerationService PdfGenerationService { get; } = new();

    private readonly Func<HttpRequestMessage, HttpResponseMessage> _aiResponder;

    // xUnit's IClassFixture instantiates fixtures via a plain parameterless constructor, so
    // that form must exist explicitly; tests that need a canned AI response construct the
    // factory directly instead (see AiEndpointsTests).
    public SmartCvWebApplicationFactory() : this(null) { }

    internal SmartCvWebApplicationFactory(Func<HttpRequestMessage, HttpResponseMessage>? aiResponder)
    {
        _aiResponder = aiResponder ?? (_ => throw new InvalidOperationException(
            "Test attempted a real outbound AI provider call — configure an aiResponder instead."));
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // The real hosted service launches/downloads Chromium on startup; tests must
            // never trigger that.
            services.RemoveAll<IHostedService>();

            services.RemoveAll<PdfGenerationService>();
            services.RemoveAll<IPdfGenerationService>();
            services.AddSingleton<IPdfGenerationService>(PdfGenerationService);

            services.RemoveAll<IHttpClientFactory>();
            services.AddSingleton<IHttpClientFactory>(new FakeHttpClientFactory(_aiResponder));
        });
    }
}
