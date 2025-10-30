using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;

namespace SiyeFlow.UI
{
    public class SiyeFlowMiddleware
    {
        private const string EmbeddedFileNamespace = "SiyeFlow.UI.UI";
        private readonly RequestDelegate _next;
        private readonly SiyeFlowOptions _options;
        private readonly ILogger<SiyeFlowMiddleware> _logger;
        private readonly StaticFileMiddleware _staticFileMiddleware;
        private readonly Assembly _assembly;
        private readonly string _indexContent;

        public SiyeFlowMiddleware(
            RequestDelegate next,
            IOptions<SiyeFlowOptions> options,
            ILoggerFactory loggerFactory,
            IWebHostEnvironment hostingEnv)
        {
            _next = next;
            _options = options.Value;
            _logger = loggerFactory.CreateLogger<SiyeFlowMiddleware>();
            _assembly = typeof(SiyeFlowMiddleware).Assembly;

            // Load and process index.html
            _indexContent = LoadIndexHtml();

            // Configure static file serving for embedded resources
            var staticFileOptions = new StaticFileOptions
            {
                RequestPath = string.IsNullOrEmpty(_options.RoutePrefix) ? string.Empty : $"/{_options.RoutePrefix}",
                FileProvider = new EmbeddedFileProvider(_assembly, EmbeddedFileNamespace),
                ContentTypeProvider = new FileExtensionContentTypeProvider()
            };

            _staticFileMiddleware = new StaticFileMiddleware(next, hostingEnv, Options.Create(staticFileOptions), loggerFactory);
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value ?? "";

            // Redirect root to index
            if (IsRootPath(path))
            {
                context.Response.Redirect($"{context.Request.PathBase}/{_options.RoutePrefix}/index.html");
                return;
            }

            // Serve index.html
            if (IsIndexPath(path))
            {
                await ServeIndexHtml(context);
                return;
            }

            // Serve other static files
            if (IsUiPath(path))
            {
                await _staticFileMiddleware.Invoke(context);
                return;
            }

            await _next(context);
        }

        private bool IsRootPath(string path)
        {
            return path == $"/{_options.RoutePrefix}" || path == $"/{_options.RoutePrefix}/";
        }

        private bool IsIndexPath(string path)
        {
            return path == $"/{_options.RoutePrefix}/index.html";
        }

        private bool IsUiPath(string path)
        {
            return path.StartsWith($"/{_options.RoutePrefix}/", StringComparison.OrdinalIgnoreCase);
        }

        private string LoadIndexHtml()
        {
            using var stream = _assembly.GetManifestResourceStream($"{EmbeddedFileNamespace}.index.html");
            if (stream == null)
            {
                throw new InvalidOperationException("Could not find embedded index.html");
            }

            using var reader = new StreamReader(stream);
            var html = reader.ReadToEnd();

            // Apply customizations
            html = html.Replace("{{DocumentTitle}}", _options.DocumentTitle);
            html = html.Replace("{{RoutePrefix}}", _options.RoutePrefix);
            html = html.Replace("{{Theme}}", _options.Theme);
            
            if (!string.IsNullOrEmpty(_options.CustomCss))
            {
                html = html.Replace("{{CustomCss}}", $"<style>{_options.CustomCss}</style>");
            }
            else
            {
                html = html.Replace("{{CustomCss}}", "");
            }

            // Inject configuration
            var configScript = $@"
<script>
    window.SiyeFlowConfig = {{
        routePrefix: '{_options.RoutePrefix}',
        enableEditor: {_options.EnableEditor.ToString().ToLower()},
        showSamples: {_options.ShowSamples.ToString().ToLower()},
        enableRealTimeMonitoring: {_options.EnableRealTimeMonitoring.ToString().ToLower()},
        theme: '{_options.Theme}'
    }};
</script>";

            html = html.Replace("</head>", $"{configScript}</head>");

            return html;
        }

        private async Task ServeIndexHtml(HttpContext context)
        {
            context.Response.ContentType = "text/html; charset=utf-8";
            context.Response.StatusCode = 200;
            
            await context.Response.WriteAsync(_indexContent, Encoding.UTF8);
        }
    }
}
