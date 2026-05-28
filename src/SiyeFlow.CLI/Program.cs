using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.CLI.Services;
using SiyeFlow.CLI.Services.Blocks;
using SiyeFlow.Core.Models;
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
            var rootCommand = new RootCommand("SiyeFlow - Visual workflow automation for APIs");

            // Execute command options
            var workflowOption = new Option<string>(
                new[] { "--workflow", "-w" },
                "Path to workflow definition file") { IsRequired = true };
            var apiOption = new Option<string?>(
                new[] { "--api", "-a" },
                "Path to OpenAPI specification file (optional)");
            var inputsOption = new Option<string?>(
                new[] { "--inputs", "-i" },
                "Input parameters as JSON string or file path");
            var profileOption = new Option<string?>(
                new[] { "--profile", "-p" },
                "Profile to use from Start block configuration");
            var dryRunOption = new Option<bool>(
                new[] { "--dry-run", "-d" },
                getDefaultValue: () => false,
                "Simulate execution without making actual HTTP calls");
            var outputOption = new Option<string?>(
                new[] { "--output", "-o" },
                "Save execution results to file");
            var verboseOption = new Option<bool>(
                new[] { "--verbose", "-v" },
                getDefaultValue: () => false,
                "Enable verbose logging");

            var executeCommand = new Command("execute", "Execute a workflow");
            executeCommand.Add(workflowOption);
            executeCommand.Add(apiOption);
            executeCommand.Add(inputsOption);
            executeCommand.Add(profileOption);
            executeCommand.Add(dryRunOption);
            executeCommand.Add(outputOption);
            executeCommand.Add(verboseOption);

            executeCommand.SetHandler(async (workflow, api, inputs, profile, dryRun, output, verbose) =>
            {
                await ExecuteWorkflow(workflow, api, inputs, profile, dryRun, output, verbose);
            },
            workflowOption, apiOption, inputsOption, profileOption, dryRunOption, outputOption, verboseOption);

            // Validate command
            var validateCommand = new Command("validate", "Validate a workflow");

            var workflowOption2 = new Option<string>(
                new[] { "--workflow", "-w" },
                "Path to workflow JSON file") { IsRequired = true };
            var apiOption2 = new Option<string?>(
                new[] { "--api", "-a" },
                "Path to OpenAPI specification file");
            
            validateCommand.Add(workflowOption2);
            validateCommand.Add(apiOption2);
            
            validateCommand.SetHandler(async (workflow, api) =>
            {
                await ValidateWorkflow(workflow, api);
            },
            workflowOption2, apiOption2);

            // Generate docs command
            var docsCommand = new Command("docs", "Generate workflow documentation");

            var workflowOption3 = new Option<string>(
                new[] { "--workflow", "-w" },
                "Path to workflow JSON file") { IsRequired = true };
            var outputOption2 = new Option<string>(
                new[] { "--output", "-o" },
                getDefaultValue: () => "workflow-docs.html",
                "Output file path");
            
            docsCommand.Add(workflowOption3);
            docsCommand.Add(outputOption2);
            
            docsCommand.SetHandler(async (workflow, output) =>
            {
                await GenerateDocs(workflow, output);
            },
            workflowOption3, outputOption2);

            rootCommand.AddCommand(executeCommand);
            rootCommand.AddCommand(validateCommand);
            rootCommand.AddCommand(docsCommand);

            return await rootCommand.InvokeAsync(args);
        }

        private static async Task ExecuteWorkflow(
            string workflowPath, 
            string? apiPath, 
            string? inputs, 
            string? profile,
            bool dryRun, 
            string? output,
            bool verbose)
        {
            var services = ConfigureServices(verbose);
            var executor = services.GetRequiredService<IWorkflowExecutor>();
            var console = services.GetRequiredService<IConsoleWriter>();

            try
            {
                console.Info($"Loading workflow from: {workflowPath}");
                if (!string.IsNullOrEmpty(apiPath))
                {
                    console.Info($"Loading API from: {apiPath}");
                }
                else
                {
                    console.Info("Running without API definition (direct HTTP mode)");
                }

                // Parse inputs if provided
                var inputDict = ParseInputs(inputs);
                
                // Add profile selection to inputs if specified
                if (!string.IsNullOrEmpty(profile))
                {
                    inputDict = inputDict ?? new Dictionary<string, object>();
                    inputDict["$selectedProfile"] = profile;
                    console.Info($"Using profile: {profile}");
                }

                // Execute workflow
                var result = await executor.ExecuteFromPathAsync(
                    workflowPath,
                    apiPath,
                    inputDict,
                    dryRun);

                // Display results
                if (result.Success)
                {
                    console.Success("Workflow executed successfully!");
                    console.Info($"Duration: {result.Duration.TotalSeconds:F2}s");
                    
                    if (result.Outputs.Count > 0)
                    {
                        console.Info("\nOutputs:");
                        foreach (var outputVar in result.Outputs)
                        {
                            var valueStr = outputVar.Value switch
                            {
                                null => "null",
                                string s => s,
                                System.Collections.IEnumerable e when !(e is string) => 
                                    Newtonsoft.Json.JsonConvert.SerializeObject(e, Newtonsoft.Json.Formatting.None),
                                _ => outputVar.Value.ToString() ?? "null"
                            };
                            console.Info($"  {outputVar.Key}: {valueStr}");
                        }
                    }
                }
                else
                {
                    console.Error($"Workflow failed: {result.Error}");
                }

                // Save results if requested
                if (!string.IsNullOrEmpty(output))
                {
                    var json = Newtonsoft.Json.JsonConvert.SerializeObject(result, Newtonsoft.Json.Formatting.Indented);
                    await File.WriteAllTextAsync(output, json);
                    console.Success($"Results saved to: {output}");
                }
            }
            catch (Exception ex)
            {
                console.Error($"Execution failed: {ex.Message}");
                if (verbose)
                {
                    console.Error(ex.ToString());
                }
                Environment.Exit(1);
            }
        }

        private static async Task ValidateWorkflow(string workflowPath, string? apiPath)
        {
            var services = ConfigureServices(false);
            var executor = services.GetRequiredService<IWorkflowExecutor>();
            var console = services.GetRequiredService<IConsoleWriter>();
            var apiLoader = services.GetRequiredService<IApiDefinitionLoader>();

            try
            {
                console.Info($"Validating workflow: {workflowPath}");

                // Load workflow
                var workflowJson = await File.ReadAllTextAsync(workflowPath);
                var workflow = Newtonsoft.Json.JsonConvert.DeserializeObject<WorkflowDefinition>(workflowJson);

                if (workflow == null)
                
                {
                    console.Error("Failed to parse workflow file");
                    Environment.Exit(1);
                    return;
                }

                // Load API if provided
                Microsoft.OpenApi.Models.OpenApiDocument? api = null;
                if (!string.IsNullOrEmpty(apiPath))
                {
                    api = await apiLoader.LoadAsync(apiPath);
                }

                // Validate
                var result = await executor.ValidateAsync(workflow, api);

                if (result.IsValid)
                {
                    console.Success("✓ Workflow is valid");
                }
                else
                {
                    console.Error("✗ Workflow validation failed:");
                    foreach (var error in result.Errors)
                    {
                        console.Error($"  - {error.Message}");
                    }
                    Environment.Exit(1);
                }

                if (result.Warnings.Count > 0)
                {
                    console.Warning("\nWarnings:");
                    foreach (var warning in result.Warnings)
                    {
                        console.Warning($"  - {warning.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                console.Error($"Validation failed: {ex.Message}");
                Environment.Exit(1);
            }
        }

        private static async Task GenerateDocs(string workflowPath, string outputDir)
        {
            var services = ConfigureServices(false);
            var console = services.GetRequiredService<IConsoleWriter>();

            try
            {
                console.Info($"Generating documentation for: {workflowPath}");
                console.Info($"Output directory: {outputDir}");

                // TODO: Implement documentation generator for new schema
                console.Warning("Documentation generator not yet implemented for new schema");
            }
            catch (Exception ex)
            {
                console.Error($"Documentation generation failed: {ex.Message}");
                Environment.Exit(1);
            }
        }

        private static IServiceProvider ConfigureServices(bool verbose)
        {
            var services = new ServiceCollection();

            // Logging
            services.AddLogging(builder =>
            {
                builder.SetMinimumLevel(verbose ? LogLevel.Debug : LogLevel.Information);
                builder.AddConsole();
            });

            // HTTP
            services.AddHttpClient();

            // Core services
            services.AddSingleton<IConsoleWriter, ConsoleWriter>();
            services.AddScoped<IVariableStore, VariableStore>();
            services.AddScoped<IApiDefinitionLoader, ApiDefinitionLoader>();
            services.AddScoped<IExpressionEvaluator, ExpressionEvaluator>();

            // Block registry
            services.AddSingleton<IBlockRegistry, BlockRegistry>();
            
            // Block executors
            services.AddScoped<StartBlockExecutor>();
            services.AddScoped<EndBlockExecutor>();
            services.AddScoped<HttpRequestBlockExecutor>();
            services.AddScoped<VariableBlockExecutor>();
            services.AddScoped<LogBlockExecutor>();
            services.AddScoped<DelayBlockExecutor>();
            services.AddScoped<ConditionBlockExecutor>();
            services.AddScoped<LoopBlockExecutor>();
            services.AddScoped<EvaluateBlockExecutor>();
            services.AddScoped<SubWorkflowBlockExecutor>();
            services.AddScoped<FileDownloadBlockExecutor>();
            services.AddScoped<FileUploadBlockExecutor>();
            services.AddScoped<FileStreamWriterBlockExecutor>();
            services.AddScoped<FileStreamReaderBlockExecutor>();

            // Workflow executor
            services.AddScoped<IWorkflowExecutor, WorkflowExecutor>();

            return services.BuildServiceProvider();
        }

        private static Dictionary<string, object>? ParseInputs(string? inputs)
        {
            if (string.IsNullOrEmpty(inputs))
                return null;

            try
            {
                // Check if it's a file path
                if (File.Exists(inputs))
                {
                    inputs = File.ReadAllText(inputs);
                }

                return Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, object>>(inputs);
            }
            catch
            {
                // If parsing fails, treat as single string input
                return new Dictionary<string, object> { ["input"] = inputs };
            }
        }
    }
}
