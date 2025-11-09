using SiyeFlow.TestApi.Services;
using SiyeFlow.UI;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() 
    { 
        Title = "SiyeFlow Test API", 
        Version = "v1",
        Description = "A test API for demonstrating SiyeFlow CLI workflows"
    });
});

// Register our data service as singleton for in-memory storage
builder.Services.AddSingleton<IDataService, DataService>();

// Add SiyeFlow Designer UI - visual workflow designer only (no execution)
builder.Services.AddSiyeFlowDesigner(options =>
{
    options.RoutePrefix = "workflows";
    options.DocumentTitle = "SiyeFlow Workflow Designer";
});

// Configure CORS to allow CLI to call the API
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "SiyeFlow Test API v1");
    });
}

// Only use HTTPS redirection if HTTPS is configured (check launchSettings or environment)
var urls = app.Configuration["ASPNETCORE_URLS"] ?? "";
var hasHttps = urls.Contains("https://") || app.Environment.IsProduction();

if (hasHttps)
{
    app.UseHttpsRedirection();
}

app.UseCors();

// Use SiyeFlow Designer UI - accessible at /workflows
app.UseSiyeFlowDesigner();

app.UseAuthorization();
app.MapControllers();

// Add a simple health check endpoint
app.MapGet("/", () => new { 
    message = "SiyeFlow Test API is running!", 
    timestamp = DateTime.UtcNow 
}).WithName("HealthCheck");

app.Run();
