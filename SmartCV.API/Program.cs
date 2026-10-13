using Microsoft.AspNetCore.HttpOverrides;
using SmartCV.API.Endpoints;
using SmartCV.API.Infrastructure;
using SmartCV.API.Services;

var builder = WebApplication.CreateBuilder(args);

if (!builder.Environment.IsDevelopment())
{
    // One JSON object per line so CloudWatch can filter on fields.
    builder.Logging.ClearProviders();
    builder.Logging.AddJsonConsole();
}

builder.Services.AddProblemDetails();
builder.Services.AddHttpClient(AIProxyService.HttpClientName, client => client.Timeout = TimeSpan.FromSeconds(120));
builder.Services.AddScoped<AIProxyService>();
builder.Services.AddScoped<PdfResumeParserService>();
builder.Services.AddSingleton<PdfGenerationService>();
builder.Services.AddSingleton<IPdfGenerationService>(sp => sp.GetRequiredService<PdfGenerationService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<PdfGenerationService>());
builder.Services.AddSmartCvRateLimiting(builder.Configuration);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    // App Runner terminates TLS at its load balancer and appends the caller's IP to
    // X-Forwarded-For. Its proxy addresses aren't published, so trust the last hop only.
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// The Next dev server (port 3000) calls the API cross-origin; production is same-origin.
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins("http://localhost:3000")
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseSecurityHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseCors();
}
else
{
    app.UseHttpsRedirection();
}

app.UseRateLimiter();

app.MapPdfEndpoints();
app.MapAiEndpoints();
app.MapFrontend();

app.Run();

// Exposes the top-level Program for WebApplicationFactory<Program> in SmartCV.API.Tests.
public partial class Program;
