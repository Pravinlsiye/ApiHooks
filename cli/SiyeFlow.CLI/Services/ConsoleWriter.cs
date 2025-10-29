using SiyeFlow.CLI.Interfaces;
using SiyeFlow.CLI.Models;
using System;
using System.Linq;

namespace SiyeFlow.CLI.Services
{
    /// <summary>
    /// Service for writing formatted output to console
    /// </summary>
    public class ConsoleWriter : IConsoleWriter
    {
        private readonly object _lock = new object();

        public void Info(string message)
        {
            WriteLine($"[{DateTime.Now:HH:mm:ss}] {message}", ConsoleColor.White);
        }

        public void Success(string message)
        {
            WriteLine($"[{DateTime.Now:HH:mm:ss}] ✓ {message}", ConsoleColor.Green);
        }

        public void Warning(string message)
        {
            WriteLine($"[{DateTime.Now:HH:mm:ss}] ⚠ {message}", ConsoleColor.Yellow);
        }

        public void Error(string message)
        {
            WriteLine($"[{DateTime.Now:HH:mm:ss}] ✗ {message}", ConsoleColor.Red);
        }

        public void Debug(string message)
        {
            WriteLine($"[{DateTime.Now:HH:mm:ss}] [DEBUG] {message}", ConsoleColor.Gray);
        }

        public void StepStart(FlowStep step)
        {
            EmptyLine();
            WriteLine($"┌─ Step: {step.Name} [{step.Id}]", ConsoleColor.Cyan);
            
            if (!string.IsNullOrEmpty(step.Description))
            {
                WriteLine($"│  {step.Description}", ConsoleColor.Gray);
            }
            
            WriteLine($"│  Method: {step.Method?.ToUpper() ?? "GET"} {step.Path}", ConsoleColor.Gray);
            
            if (!string.IsNullOrEmpty(step.OperationId))
            {
                WriteLine($"│  Operation: {step.OperationId}", ConsoleColor.Gray);
            }
        }

        public void StepResult(StepResult result)
        {
            var color = result.Success ? ConsoleColor.Green : ConsoleColor.Red;
            var symbol = result.Success ? "✓" : "✗";
            
            WriteLine($"│  Status: {result.StatusCode} - {symbol}", color);
            WriteLine($"│  Duration: {result.Duration.TotalMilliseconds:F0}ms", ConsoleColor.Gray);
            
            if (!string.IsNullOrEmpty(result.Error))
            {
                WriteLine($"│  Error: {result.Error}", ConsoleColor.Red);
            }
            
            WriteLine($"└─ Completed at {result.ExecutedAt:HH:mm:ss}", ConsoleColor.Cyan);
        }

        public void FlowSummary(FlowExecutionResult result)
        {
            Separator();
            WriteLine("FLOW EXECUTION SUMMARY", ConsoleColor.White);
            Separator();
            
            WriteLine($"Flow: {result.FlowName}", ConsoleColor.White);
            WriteLine($"Started: {result.StartedAt:yyyy-MM-dd HH:mm:ss}", ConsoleColor.Gray);
            WriteLine($"Completed: {result.CompletedAt:yyyy-MM-dd HH:mm:ss}", ConsoleColor.Gray);
            WriteLine($"Total Duration: {result.TotalDuration.TotalSeconds:F2}s", ConsoleColor.Gray);
            
            EmptyLine();
            
            var successCount = result.StepResults.Count(r => r.Success);
            var failureCount = result.StepResults.Count - successCount;
            
            WriteLine($"Steps Executed: {result.StepResults.Count}", ConsoleColor.White);
            WriteLine($"  Successful: {successCount}", ConsoleColor.Green);
            WriteLine($"  Failed: {failureCount}", failureCount > 0 ? ConsoleColor.Red : ConsoleColor.Gray);
            
            if (failureCount > 0)
            {
                EmptyLine();
                WriteLine("Failed Steps:", ConsoleColor.Red);
                foreach (var failed in result.StepResults.Where(r => !r.Success))
                {
                    WriteLine($"  - {failed.StepName}: {failed.Error}", ConsoleColor.Red);
                }
            }
            
            EmptyLine();
            WriteLine($"Overall Result: {(result.Success ? "SUCCESS" : "FAILURE")}", 
                result.Success ? ConsoleColor.Green : ConsoleColor.Red);
            
            Separator();
        }

        public void Progress(string message, int current, int total)
        {
            var percentage = total > 0 ? (current * 100.0 / total) : 0;
            var progressBar = GenerateProgressBar(percentage);
            
            lock (_lock)
            {
                Console.Write($"\r[{progressBar}] {percentage:F0}% - {message}");
                if (current >= total)
                {
                    Console.WriteLine();
                }
            }
        }

        public void Separator()
        {
            WriteLine(new string('─', 60), ConsoleColor.Gray);
        }

        public void EmptyLine()
        {
            Console.WriteLine();
        }

        public void ShowHelp()
        {
            Console.WriteLine();
            WriteLine("SiyeFlow CLI - API Workflow Executor", ConsoleColor.Cyan);
            Separator();
            
            Console.WriteLine("USAGE:");
            Console.WriteLine("  SiyeFlow.CLI --api <openapi.json> --flow <flow.json> [options]");
            Console.WriteLine();
            
            Console.WriteLine("REQUIRED ARGUMENTS:");
            Console.WriteLine("  --api <path>     Path to OpenAPI 3.0 specification file");
            Console.WriteLine("  --flow <path>    Path to workflow definition file");
            Console.WriteLine();
            
            Console.WriteLine("OPTIONS:");
            Console.WriteLine("  --dry-run        Simulate the flow without making actual HTTP calls");
            Console.WriteLine("  --output <path>  Save execution results to JSON file");
            Console.WriteLine("  --verbose        Enable verbose logging");
            Console.WriteLine("  --help           Show this help message");
            Console.WriteLine();
            
            Console.WriteLine("EXAMPLES:");
            Console.WriteLine("  SiyeFlow.CLI --api ./api.json --flow ./workflow.json");
            Console.WriteLine("  SiyeFlow.CLI --api ./api.json --flow ./workflow.json --dry-run");
            Console.WriteLine("  SiyeFlow.CLI --api ./api.json --flow ./workflow.json --output ./results.json");
            Console.WriteLine();
            
            Console.WriteLine("FLOW FILE FORMAT:");
            Console.WriteLine("  The flow file should be a JSON file with the following structure:");
            Console.WriteLine("  {");
            Console.WriteLine("    \"name\": \"My Workflow\",");
            Console.WriteLine("    \"variables\": { \"key\": \"value\" },");
            Console.WriteLine("    \"steps\": [");
            Console.WriteLine("      {");
            Console.WriteLine("        \"id\": \"step1\",");
            Console.WriteLine("        \"name\": \"First API Call\",");
            Console.WriteLine("        \"operationId\": \"getUser\",");
            Console.WriteLine("        \"parameters\": { \"id\": \"{{userId}}\" },");
            Console.WriteLine("        \"extractVariables\": { \"userName\": \"$.name\" }");
            Console.WriteLine("      }");
            Console.WriteLine("    ]");
            Console.WriteLine("  }");
            Console.WriteLine();
            
            Separator();
        }

        private void WriteLine(string message, ConsoleColor color)
        {
            lock (_lock)
            {
                var originalColor = Console.ForegroundColor;
                Console.ForegroundColor = color;
                Console.WriteLine(message);
                Console.ForegroundColor = originalColor;
            }
        }

        private string GenerateProgressBar(double percentage)
        {
            const int barLength = 20;
            var filled = (int)(barLength * percentage / 100);
            var empty = barLength - filled;
            
            return new string('█', filled) + new string('░', empty);
        }
    }
}
