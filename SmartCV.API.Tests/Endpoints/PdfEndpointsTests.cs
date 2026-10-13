using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using SmartCV.API.Endpoints;
using SmartCV.API.Services;
using SmartCV.API.Tests.TestUtilities;

namespace SmartCV.API.Tests.Endpoints;

// Boots the real Minimal API pipeline (routing, model binding, validation) end-to-end over
// HTTP via WebApplicationFactory. The Puppeteer/Chromium-backed PdfGenerationService and
// outbound AI HTTP calls are swapped for fakes (see SmartCvWebApplicationFactory) so these
// tests are fast and hermetic.
public class PdfEndpointsTests : IClassFixture<SmartCvWebApplicationFactory>
{
    private readonly SmartCvWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public PdfEndpointsTests(SmartCvWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PdfGenerate_BlankHtml_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/pdf/generate", new { html = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PdfGenerate_ValidHtml_ReturnsPdfBytesFromGenerationService()
    {
        const string html = "<h1>Resume</h1>";
        var response = await _client.PostAsJsonAsync("/api/pdf/generate", new { html, filename = "resume.pdf" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(html, _factory.PdfGenerationService.LastHtml);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(Encoding.UTF8.GetBytes($"%PDF-FAKE% {html.Length} bytes of html"), bytes);
    }

    [Fact]
    public async Task PdfGenerate_OversizedHtml_ReturnsPayloadTooLarge()
    {
        var html = new string('a', PdfEndpoints.MaxHtmlChars + 1);

        var response = await _client.PostAsJsonAsync("/api/pdf/generate", new { html });

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }

    [Theory]
    [InlineData("../../etc/passwd", "passwd.pdf")]
    [InlineData("Jane \"Smith\".pdf", "Jane Smith.pdf")]
    [InlineData(null, "resume.pdf")]
    public async Task PdfGenerate_SanitisesDownloadFileName(string? requested, string expected)
    {
        var response = await _client.PostAsJsonAsync("/api/pdf/generate", new { html = "<p>x</p>", filename = requested });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(expected, response.Content.Headers.ContentDisposition?.FileNameStar
            ?? response.Content.Headers.ContentDisposition?.FileName?.Trim('"'));
    }

    [Fact]
    public async Task PdfGenerate_RendererTimesOut_ReturnsStatusFromException()
    {
        using var factory = new SmartCvWebApplicationFactory();
        factory.PdfGenerationService.FailWith = new PdfGenerationException(504, "PDF rendering timed out.");
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/pdf/generate", new { html = "<p>x</p>" });

        Assert.Equal(HttpStatusCode.GatewayTimeout, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("PDF rendering timed out.", doc.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task PdfParse_UploadEndpointIsGone()
    {
        // PDFs are read in the browser now; the server no longer accepts PDF uploads.
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent([1, 2, 3]), "file", "resume.pdf");

        var response = await _client.PostAsync("/api/pdf/parse", form);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PdfParseText_BlankText_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/pdf/parse-text", new { text = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PdfParseText_OversizedText_ReturnsPayloadTooLarge()
    {
        var text = new string('a', PdfEndpoints.MaxResumeTextChars + 1);

        var response = await _client.PostAsJsonAsync("/api/pdf/parse-text", new { text });

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }

    [Fact]
    public async Task PdfParseText_ValidText_ReturnsParsedPersonalInfo()
    {
        var response = await _client.PostAsJsonAsync("/api/pdf/parse-text", new { text = "Jane Smith\njane.smith@example.com\n" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var personalInfo = doc.RootElement.GetProperty("personalInfo");

        Assert.Equal("Jane Smith", personalInfo.GetProperty("fullName").GetString());
        Assert.Equal("jane.smith@example.com", personalInfo.GetProperty("email").GetString());
    }

    [Fact]
    public async Task PdfEndpoints_AreRateLimitedPerClient()
    {
        using var factory = new SmartCvWebApplicationFactory(null, new Dictionary<string, string?>
        {
            ["RateLimiting:PdfPerMinute"] = "2",
        });
        using var client = factory.CreateClient();

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 3; i++)
            statuses.Add((await client.PostAsJsonAsync("/api/pdf/parse-text", new { text = "Jane Smith" })).StatusCode);

        Assert.Equal([HttpStatusCode.OK, HttpStatusCode.OK, HttpStatusCode.TooManyRequests], statuses);
    }
}
