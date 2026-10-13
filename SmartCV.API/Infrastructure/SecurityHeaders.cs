using Microsoft.AspNetCore.Http.Metadata;

namespace SmartCV.API.Infrastructure;

public static class SecurityHeaders
{
    // The static Next.js export relies on inline bootstrap scripts and inline styles, so
    // those stay allowed; everything else is pinned to this origin. Tesseract (OCR for
    // image-only PDFs) loads its worker, wasm core and language data from jsDelivr.
    // connect-src 'self' means a script injected into the page cannot ship API keys or
    // resume data anywhere except this app's own API.
    private const string ContentSecurityPolicy =
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; " +
        "worker-src 'self' blob:; " +
        "connect-src 'self' https://cdn.jsdelivr.net; " +
        "img-src 'self' data: blob:; " +
        "style-src 'self' 'unsafe-inline'; " +
        "font-src 'self' data:; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'";

    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) =>
        app.Use(async (context, next) =>
        {
            context.Response.OnStarting(() =>
            {
                var headers = context.Response.Headers;
                headers.ContentSecurityPolicy = ContentSecurityPolicy;
                headers.XContentTypeOptions = "nosniff";
                headers.XFrameOptions = "DENY";
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
                headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=(self)";
                return Task.CompletedTask;
            });
            await next();
        });

    /// <summary>Caps the request body size for one endpoint (enforced by Kestrel).</summary>
    public static TBuilder WithRequestSizeLimit<TBuilder>(this TBuilder builder, long maxBytes)
        where TBuilder : IEndpointConventionBuilder =>
        builder.WithMetadata(new RequestSizeLimit(maxBytes));

    private sealed record RequestSizeLimit(long? MaxRequestBodySize) : IRequestSizeLimitMetadata;
}
