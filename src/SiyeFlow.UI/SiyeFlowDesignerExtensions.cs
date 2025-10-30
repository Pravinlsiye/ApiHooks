using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace SiyeFlow.UI
{
    /// <summary>
    /// Extension methods for adding SiyeFlow Designer UI only (no execution)
    /// </summary>
    public static class SiyeFlowDesignerExtensions
    {
        /// <summary>
        /// Adds SiyeFlow Designer UI services (no execution capabilities)
        /// </summary>
        public static IServiceCollection AddSiyeFlowDesigner(this IServiceCollection services, Action<SiyeFlowOptions>? setupAction = null)
        {
            // Configure options
            if (setupAction != null)
            {
                services.Configure(setupAction);
            }
            else
            {
                services.Configure<SiyeFlowOptions>(options => { });
            }

            // Add CORS if not already added
            services.AddCors(options =>
            {
                options.AddPolicy("SiyeFlowDesignerPolicy", policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                });
            });

            return services;
        }

        /// <summary>
        /// Adds the SiyeFlow Designer UI middleware (no execution endpoints)
        /// </summary>
        public static IApplicationBuilder UseSiyeFlowDesigner(this IApplicationBuilder app, Action<SiyeFlowOptions>? setupAction = null)
        {
            // Get or create options
            SiyeFlowOptions options;
            using (var scope = app.ApplicationServices.CreateScope())
            {
                options = scope.ServiceProvider.GetService<IOptions<SiyeFlowOptions>>()?.Value ?? new SiyeFlowOptions();
            }

            if (setupAction != null)
            {
                setupAction(options);
            }

            // Use the middleware for UI only
            app.UseMiddleware<SiyeFlowMiddleware>();

            return app;
        }
    }
}
