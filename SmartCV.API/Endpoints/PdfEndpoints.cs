using SmartCV.API.Infrastructure;
using SmartCV.API.Services;

namespace SmartCV.API.Endpoints;

public static class PdfEndpoints
{
    // A rendered resume is a few hundred KB of inline-styled markup at most.
    public const int MaxHtmlChars = 2_000_000;
    public const int MaxResumeTextChars = 200_000;

    public static IEndpointRouteBuilder MapPdfEndpoints(this IEndpointRouteBuilder app)
    {
        var pdf = app.MapGroup("/api/pdf").RequireRateLimiting(RateLimiting.PdfPolicy);

        // Render resume HTML to PDF (Puppeteer/Chromium).
        pdf.MapPost("/generate", async (PdfGenerateRequest req, IPdfGenerationService pdfService, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.Html))
                return Results.BadRequest(new { error = "No HTML provided." });
            if (req.Html.Length > MaxHtmlChars)
                return Results.Json(new { error = "Document is too large." }, statusCode: StatusCodes.Status413PayloadTooLarge);

            try
            {
                var bytes = await pdfService.GenerateAsync(req.Html, ct);
                return Results.File(bytes, "application/pdf", SafeFileName(req.Filename));
            }
            catch (PdfGenerationException ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: ex.StatusCode);
            }
        })
        .WithRequestSizeLimit(MaxHtmlChars * 2);

        // Structure raw resume text (extracted in the browser by pdf.js or OCR) with the
        // rule-based parser. Used when the user has no AI provider configured.
        pdf.MapPost("/parse-text", (ParseTextRequest req, PdfResumeParserService parser) =>
        {
            if (string.IsNullOrWhiteSpace(req.Text))
                return Results.BadRequest(new { error = "No text provided." });
            if (req.Text.Length > MaxResumeTextChars)
                return Results.Json(new { error = "Text is too long." }, statusCode: StatusCodes.Status413PayloadTooLarge);

            return Results.Ok(parser.ParseText(req.Text));
        })
        .WithRequestSizeLimit(MaxResumeTextChars * 4);

        return app;
    }

    private static string SafeFileName(string? requested)
    {
        var name = string.IsNullOrWhiteSpace(requested) ? "resume.pdf" : Path.GetFileName(requested.Trim());
        name = string.Concat(name.Where(c => !char.IsControl(c) && c is not ('"' or '\\' or '/')));
        if (name.Length > 120) name = name[..120];
        return name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? name : $"{name}.pdf";
    }
}

public record ParseTextRequest(string Text);
public record PdfGenerateRequest(string Html, string? Filename);
