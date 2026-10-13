using System.Threading.RateLimiting;

namespace SmartCV.API.Infrastructure;

/// <summary>
/// Per-client-IP fixed-window limits for the expensive endpoints. The client IP comes from
/// X-Forwarded-For (see ForwardedHeaders setup in Program.cs) because the app runs behind
/// the App Runner load balancer. Limits are configurable under "RateLimiting".
/// </summary>
public static class RateLimiting
{
    public const string AiPolicy = "ai";
    public const string PdfPolicy = "pdf";

    public static IServiceCollection AddSmartCvRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        var aiPerMinute = configuration.GetValue("RateLimiting:AiPerMinute", 30);
        var pdfPerMinute = configuration.GetValue("RateLimiting:PdfPerMinute", 10);

        return services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, ct) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
                await context.HttpContext.Response.WriteAsJsonAsync(
                    new { error = "Too many requests. Please wait a moment and try again." }, ct);
            };

            options.AddPolicy(AiPolicy, ctx => PerIp(ctx, AiPolicy, aiPerMinute));
            options.AddPolicy(PdfPolicy, ctx => PerIp(ctx, PdfPolicy, pdfPerMinute));
        });
    }

    private static RateLimitPartition<string> PerIp(HttpContext context, string policy, int permitsPerMinute) =>
        RateLimitPartition.GetFixedWindowLimiter(
            $"{policy}:{context.Connection.RemoteIpAddress}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitsPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            });
}
