using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.CLI.Models;
using SiyeFlow.CLI.Services;
using System;
using System.CommandLine;
using System.CommandLine.Invocation;
using System.IO;
using System.Threading.Tasks;

namespace SiyeFlow.CLI
{
    class Program
    {
        static async Task<int> Main(string[] args)
        {
            var rootCommand = new RootCommand("SiyeFlow CLI - API Workflow Executor");

            var apiOption = new Option<FileInfo>(
                aliases: new[] { "--api", "-a" },
                description: "Path to OpenAPI 3.0 specification file")
            {
                IsRequired = true
            };

            var flowOption = new Option<FileInfo>(
                aliases: new[] { "--flow", "-f" },
                description: "Path to workflow definition file")
            {
                IsRequired = true
            };

            var dryRunOption = new Option<bool>(
                aliases: new[] { "--dry-run", "-d" },
                description: "Simulate the flow without making actual HTTP calls",
                getDefaultValue: () => false);

            var outputOption = new Option<FileInfo?>(
                aliases: new[] { "--output", "-o" },
                description: "Save execution results to JSON file");

            var verboseOption = new Option<bool>(
                aliases: new[] { "--verbose", "-v" },
                description: "Enable verbose logging",
                getDefaultValue: () => false);

            rootCommand.AddOption(apiOption);
            rootCommand.AddOption(flowOption);
            rootCommand.AddOption(dryRunOption);
            rootCommand.AddOption(outputOption);
            rootCommand.AddOption(verboseOption);

            rootCommand.SetHandler(async (InvocationContext context) =>
            {
                var apiFile = context.ParseResult.GetValueForOption(apiOption)!;
                var flowFile = context.ParseResult.GetValueForOption(flowOption)!;
                var dryRun = context.ParseResult.GetValueForOption(dryRunOption);
                var outputFile = context.ParseResult.GetValueForOption(outputOption);
                var verbose = context.ParseResult.GetValueForOption(verboseOption);

                await ExecuteFlowAsync(apiFile, flowFile, dryRun, outputFile, verbose);
            });

            // Add help command
            var helpCommand = new Command("help", "Show help information");
            helpCommand.SetHandler(() =>
            {
                var console = new ConsoleWriter();
                console.ShowHelp();
            });
            rootCommand.AddCommand(helpCommand);

            return await rootCommand.InvokeAsync(args);
        }

        private static async Task ExecuteFlowAsync(
            FileInfo apiFile,
            FileInfo flowFile,
            bool dryRun,
            FileInfo? outputFile,
            bool verbose)
        {
            // Setup dependency injection
            var services = new ServiceCollection();
            ConfigureServices(services, verbose);
            
            using var serviceProvider = services.BuildServiceProvider();
            var console = serviceProvider.GetRequiredService<IConsoleWriter>();

            try
            {
                console.Separator();
                console.Info("SiyeFlow CLI - Starting execution");
                console.Separator();

                // Validate files exist
                if (!apiFile.Exists)
                {
                    console.Error($"API file not found: {apiFile.FullName}");
                    return;
                }

                if (!flowFile.Exists)
                {
                    console.Error($"Flow file not found: {flowFile.FullName}");
                    return;
                }

                // Load API definition
                var apiLoader = serviceProvider.GetRequiredService<IApiDefinitionLoader>();
                var apiDocument = await apiLoader.LoadAsync(apiFile.FullName);

                // Validate API document
                if (!apiLoader.Validate(apiDocument, out var errors))
                {
                    console.Error("API document validation failed. Continuing anyway...");
                }

                // Load flow definition
                console.Info($"Loading flow definition from: {flowFile.FullName}");
                var flowJson = await File.ReadAllTextAsync(flowFile.FullName);
                var flow = JsonConvert.DeserializeObject<FlowDefinition>(flowJson);

                if (flow == null)
                {
                    console.Error("Failed to parse flow definition");
                    return;
                }

                console.Success($"Loaded flow: {flow.Name}");

                // Execute flow
                var executor = serviceProvider.GetRequiredService<IFlowExecutor>();
                var result = await executor.ExecuteAsync(flow, apiDocument, dryRun);

                // Display summary
                console.FlowSummary(result);

                // Save output if requested
                if (outputFile != null)
                {
                    console.Info($"Saving results to: {outputFile.FullName}");
                    var resultJson = JsonConvert.SerializeObject(result, Formatting.Indented);
                    await File.WriteAllTextAsync(outputFile.FullName, resultJson);
                    console.Success("Results saved successfully");
                }

                // Exit with appropriate code
                Environment.Exit(result.Success ? 0 : 1);
            }
            catch (Exception ex)
            {
                console.Error($"Fatal error: {ex.Message}");
                if (verbose)
                {
                    console.Error(ex.ToString());
                }
                Environment.Exit(1);
            }
        }

        private static void ConfigureServices(IServiceCollection services, bool verbose)
        {
            // Add logging
            services.AddLogging(builder =>
            {
                builder.AddConsole();
                builder.SetMinimumLevel(verbose ? LogLevel.Debug : LogLevel.Information);
            });

            // Add HttpClient
            services.AddHttpClient();

            // Add services
            services.AddSingleton<IConsoleWriter, ConsoleWriter>();
            services.AddSingleton<IVariableStore, VariableStore>();
            services.AddScoped<IApiDefinitionLoader, ApiDefinitionLoader>();
            services.AddScoped<IFlowExecutor, FlowExecutor>();
        }
    }
}