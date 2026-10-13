using System.Text.RegularExpressions;

namespace SmartCV.API.Endpoints;

/// <summary>
/// Serves the static Next.js export from wwwroot. Next writes each route as
/// <c>{route}.html</c>, so an extension-less request is resolved to that file; no
/// per-page mapping is needed when pages are added.
/// </summary>
public static partial class FrontendEndpoints
{
    [GeneratedRegex(@"^[a-z0-9\-]+(/[a-z0-9\-]+)*$")]
    private static partial Regex PageRouteRx();

    public static WebApplication MapFrontend(this WebApplication app)
    {
        var webRootPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot");

        app.UseStaticFiles(new StaticFileOptions
        {
            OnPrepareResponse = context =>
            {
                var path = context.Context.Request.Path.Value ?? string.Empty;
                var headers = context.Context.Response.Headers;

                if (path.StartsWith("/_next/", StringComparison.Ordinal) ||
                    path.StartsWith("/images/", StringComparison.Ordinal))
                {
                    headers.CacheControl = "public,max-age=31536000,immutable";
                }
                else if (path.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
                {
                    headers.CacheControl = "no-cache";
                }
            }
        });

        // Compatibility for pre-static-export editor URLs.
        app.MapGet("/editor/{id}", (string id) =>
            Results.Redirect($"/editor?id={Uri.EscapeDataString(id)}", permanent: false));

        app.MapFallback(context =>
        {
            var path = (context.Request.Path.Value ?? "/").Trim('/');

            if (path.Equals("api", StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith("api/", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return context.Response.WriteAsJsonAsync(new { error = "Not found." });
            }

            if (!HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method))
            {
                context.Response.StatusCode = StatusCodes.Status405MethodNotAllowed;
                return Task.CompletedTask;
            }

            var page = path.Length == 0 ? "index" : path.ToLowerInvariant();
            var file = PageRouteRx().IsMatch(page) ? Path.Combine(webRootPath, $"{page}.html") : null;

            if (file is not null && File.Exists(file))
                return Html(context, file, StatusCodes.Status200OK);

            var notFoundPage = Path.Combine(webRootPath, "404.html");
            if (File.Exists(notFoundPage))
                return Html(context, notFoundPage, StatusCodes.Status404NotFound);

            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return context.Response.WriteAsync(path.Length == 0
                ? "Frontend bundle is missing. Build SmartCV.Web before publishing the API."
                : "Not found.");
        });

        return app;
    }

    private static Task Html(HttpContext context, string file, int status)
    {
        context.Response.StatusCode = status;
        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.Headers.CacheControl = "no-cache";
        return HttpMethods.IsHead(context.Request.Method)
            ? Task.CompletedTask
            : context.Response.SendFileAsync(file);
    }
}
