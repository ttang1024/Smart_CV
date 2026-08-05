using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
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
    public async Task PdfParse_NonMultipartRequest_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/pdf/parse", new { });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PdfParse_MultipartWithoutFile_ReturnsBadRequest()
    {
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("not-a-file"), "note");

        var response = await _client.PostAsync("/api/pdf/parse", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PdfParse_NonPdfFile_ReturnsBadRequest()
    {
        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes("hello"));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
        form.Add(fileContent, "file", "resume.txt");

        var response = await _client.PostAsync("/api/pdf/parse", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PdfParse_ValidPdf_ReturnsParsedPersonalInfo()
    {
        var pdfBytes = MinimalPdfFixture.Create("Jane Smith", "jane.smith@example.com");

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(pdfBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(fileContent, "file", "resume.pdf");

        var response = await _client.PostAsync("/api/pdf/parse", form);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var personalInfo = doc.RootElement.GetProperty("personalInfo");

        Assert.Equal("Jane Smith", personalInfo.GetProperty("fullName").GetString());
        Assert.Equal("jane.smith@example.com", personalInfo.GetProperty("email").GetString());
    }

    [Fact]
    public async Task PdfParseText_BlankText_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/pdf/parse-text", new { text = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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
}
