using SmartCV.API.Models;
using SmartCV.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient();
builder.Services.AddScoped<AIProxyService>();
builder.Services.AddScoped<PdfResumeParserService>();
builder.Services.AddSingleton<PdfGenerationService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<PdfGenerationService>());

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();
var webRootPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot");

IResult FrontendPage(string fileName)
{
    var path = Path.Combine(webRootPath, fileName);
    return File.Exists(path)
        ? Results.File(path, "text/html; charset=utf-8")
        : Results.NotFound("Frontend bundle is missing. Build SmartCV.Web before publishing the API.");
}

app.UseCors();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// PDF generation endpoint (Puppeteer/Chromium)
app.MapPost("/api/pdf/generate", async (PdfGenerateRequest req, PdfGenerationService pdfService) =>
{
    if (string.IsNullOrWhiteSpace(req.Html))
        return Results.BadRequest(new { error = "No HTML provided." });

    var bytes = await pdfService.GenerateAsync(req.Html);
    return Results.File(bytes, "application/pdf", req.Filename ?? "resume.pdf");
});

// PDF parse endpoint
app.MapPost("/api/pdf/parse", async (HttpRequest request, PdfResumeParserService parser) =>
{
    if (!request.HasFormContentType)
        return Results.BadRequest(new { error = "Request must be multipart/form-data." });

    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file is null || file.Length == 0)
        return Results.BadRequest(new { error = "No file provided." });

    if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)
        && file.ContentType != "application/pdf")
        return Results.BadRequest(new { error = "Only PDF files are supported." });

    await using var stream = file.OpenReadStream();
    var result = parser.Parse(stream);
    return Results.Ok(result);
});

// Parse raw text (from client-side OCR) into structured resume
app.MapPost("/api/pdf/parse-text", (ParseTextRequest req, PdfResumeParserService parser) =>
{
    if (string.IsNullOrWhiteSpace(req.Text))
        return Results.BadRequest(new { error = "No text provided." });

    var result = parser.ParseText(req.Text);
    return Results.Ok(result);
});

// AI proxy endpoints
var ai = app.MapGroup("/api/ai");

ai.MapPost("/chat", async (AIProxyRequest request, AIProxyService proxy, CancellationToken ct) =>
    await proxy.ProxyAsync(request, ct));

ai.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

// Serve exported Next.js assets from wwwroot.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        var path = context.Context.Request.Path.Value ?? string.Empty;
        var headers = context.Context.Response.Headers;

        if (path.StartsWith("/_next/", StringComparison.Ordinal) ||
            path.StartsWith("/images/", StringComparison.Ordinal) ||
            path.EndsWith(".br", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".gz", StringComparison.OrdinalIgnoreCase))
        {
            headers.CacheControl = "public,max-age=31536000,immutable";
            return;
        }

        if (path.Equals("/", StringComparison.Ordinal) ||
            path.EndsWith("/index.html", StringComparison.OrdinalIgnoreCase))
        {
            headers.CacheControl = "no-store,no-cache,must-revalidate,max-age=0";
            headers.Pragma = "no-cache";
            headers.Expires = "0";
        }
    }
});

string[] getAndHead = ["GET", "HEAD"];

app.MapMethods("/", getAndHead, () => FrontendPage("index.html"));
app.MapMethods("/es", getAndHead, () => FrontendPage("es.html"));
app.MapMethods("/zh-cn", getAndHead, () => FrontendPage("zh-cn.html"));
app.MapMethods("/zh-tw", getAndHead, () => FrontendPage("zh-tw.html"));
app.MapMethods("/app", getAndHead, () => FrontendPage("app.html"));
app.MapMethods("/editor", getAndHead, () => FrontendPage("editor.html"));
app.MapMethods("/settings", getAndHead, () => FrontendPage("settings.html"));

// Compatibility for pre-static-export editor URLs.
app.MapGet("/editor/{id}", (string id) =>
{
    var encodedId = Uri.EscapeDataString(id);
    return Results.Redirect($"/editor?id={encodedId}", permanent: false);
});

app.Run();

record ParseTextRequest(string Text);
record PdfGenerateRequest(string Html, string? Filename);
