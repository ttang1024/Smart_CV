using SmartCV.API.Infrastructure;
using SmartCV.API.Models;
using SmartCV.API.Services;

namespace SmartCV.API.Endpoints;

public static class AiEndpoints
{
    public static IEndpointRouteBuilder MapAiEndpoints(this IEndpointRouteBuilder app)
    {
        var ai = app.MapGroup("/api/ai");

        ai.MapPost("/chat", (AIProxyRequest request, AIProxyService proxy, CancellationToken ct) =>
                proxy.ProxyAsync(request, ct))
            .RequireRateLimiting(RateLimiting.AiPolicy)
            .WithRequestSizeLimit(2_000_000);

        // Kept for existing monitors; /api/health is the canonical health check.
        ai.MapGet("/health", Healthy);
        app.MapGet("/api/health", Healthy);

        return app;
    }

    private static IResult Healthy() => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
}
