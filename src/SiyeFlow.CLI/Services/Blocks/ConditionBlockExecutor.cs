using Microsoft.Extensions.Logging;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    public class ConditionBlockExecutor : BlockExecutorBase
    {
        public ConditionBlockExecutor(
            ILogger<ConditionBlockExecutor> logger, 
            IVariableStore variableStore, 
            IConsoleWriter console) 
            : base(logger, variableStore, console) 
        { 
        }
        
        public override BlockType BlockType => BlockType.Condition;
        
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(
            Node node, 
            Dictionary<string, object>? inputs, 
            Interfaces.ExecutionContext context, 
            CancellationToken cancellationToken)
        {
            var config = GetConfig<ConditionConfig>(node);
            var rawExpression = config.Expression ?? config.Condition ?? "true";
            var expression = _variableStore.ReplaceVariables(rawExpression);

            _console.Info($"Evaluating condition: {expression}");

            bool result;
            try
            {
                result = EvaluateSimpleExpression(expression);
            }
            catch (Exception ex)
            {
                _console.Error($"Condition evaluation failed: {ex.Message}");
                return Task.FromResult(new BlockExecutionResult 
                { 
                    Success = true,
                    NextHandle = "fail",
                    Outputs = new Dictionary<string, object> { ["result"] = false }
                });
            }

            _console.Info($"Condition result: {result} (taking {(result ? "success" : "fail")} path)");

            return Task.FromResult(new BlockExecutionResult 
            { 
                Success = true,
                Outputs = new Dictionary<string, object> { ["result"] = result },
                NextHandle = result ? "success" : "fail"
            });
        }

        private bool EvaluateSimpleExpression(string expr)
        {
            expr = expr.Trim();

            if (bool.TryParse(expr, out var b)) return b;

            // == comparison
            if (expr.Contains("=="))
            {
                var parts = expr.Split("==", 2, StringSplitOptions.TrimEntries);
                if (parts.Length == 2)
                {
                    if (double.TryParse(parts[0], out var left) && double.TryParse(parts[1], out var right))
                        return left == right;
                    return string.Equals(parts[0].Trim('"', '\''), parts[1].Trim('"', '\''), StringComparison.OrdinalIgnoreCase);
                }
            }

            // != comparison
            if (expr.Contains("!="))
            {
                var parts = expr.Split("!=", 2, StringSplitOptions.TrimEntries);
                if (parts.Length == 2)
                {
                    if (double.TryParse(parts[0], out var left) && double.TryParse(parts[1], out var right))
                        return left != right;
                    return !string.Equals(parts[0].Trim('"', '\''), parts[1].Trim('"', '\''), StringComparison.OrdinalIgnoreCase);
                }
            }

            // >= comparison
            if (expr.Contains(">="))
            {
                var parts = expr.Split(">=", 2, StringSplitOptions.TrimEntries);
                if (parts.Length == 2 && double.TryParse(parts[0], out var left) && double.TryParse(parts[1], out var right))
                    return left >= right;
            }

            // <= comparison
            if (expr.Contains("<="))
            {
                var parts = expr.Split("<=", 2, StringSplitOptions.TrimEntries);
                if (parts.Length == 2 && double.TryParse(parts[0], out var left) && double.TryParse(parts[1], out var right))
                    return left <= right;
            }

            // > comparison
            if (expr.Contains(">") && !expr.Contains(">="))
            {
                var parts = expr.Split(">", 2, StringSplitOptions.TrimEntries);
                if (parts.Length == 2 && double.TryParse(parts[0], out var left) && double.TryParse(parts[1], out var right))
                    return left > right;
            }

            // < comparison
            if (expr.Contains("<") && !expr.Contains("<="))
            {
                var parts = expr.Split("<", 2, StringSplitOptions.TrimEntries);
                if (parts.Length == 2 && double.TryParse(parts[0], out var left) && double.TryParse(parts[1], out var right))
                    return left < right;
            }

            // Non-empty/non-zero = truthy
            if (double.TryParse(expr, out var num)) return num != 0;
            return !string.IsNullOrWhiteSpace(expr) && expr != "null" && expr != "undefined";
        }
        
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }

        private class ConditionConfig
        {
            public string? Expression { get; set; }
            public string? Condition { get; set; }
        }
    }
}
