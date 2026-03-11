using Microsoft.Extensions.Logging;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    public class EvaluateBlockExecutor : BlockExecutorBase
    {
        public EvaluateBlockExecutor(
            ILogger<EvaluateBlockExecutor> logger, 
            IVariableStore variableStore, 
            IConsoleWriter console) 
            : base(logger, variableStore, console) 
        {
        }
        
        public override BlockType BlockType => BlockType.Evaluate;
        
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(
            Node node, 
            Dictionary<string, object>? inputs, 
            Interfaces.ExecutionContext context, 
            CancellationToken cancellationToken)
        {
            var config = GetConfig<EvaluateConfig>(node);
            var rawExpression = config.Expression ?? "";
            var expression = _variableStore.ReplaceVariables(rawExpression);

            _console.Info($"Evaluating: {expression}");

            try
            {
                var result = EvaluateExpression(expression);
                _variableStore.SetVariable("result", result);
                _console.Success($"Result: {result}");

                return Task.FromResult(new BlockExecutionResult
                {
                    Success = true,
                    NextHandle = "success",
                    Outputs = new Dictionary<string, object> { ["result"] = result }
                });
            }
            catch (Exception ex)
            {
                _console.Error($"Evaluate error: {ex.Message}");
                return Task.FromResult(new BlockExecutionResult
                {
                    Success = false,
                    NextHandle = "fail",
                    Error = ex.Message,
                    Outputs = new Dictionary<string, object> { ["error"] = ex.Message }
                });
            }
        }

        private object EvaluateExpression(string expr)
        {
            expr = expr.Trim();

            // Try as math expression using DataTable.Compute
            try
            {
                var dt = new DataTable();
                var result = dt.Compute(expr, "");
                if (result is decimal d) return (double)d;
                if (result is int i) return i;
                if (result is long l) return l;
                return result;
            }
            catch
            {
                // Not a math expression - return as-is
            }

            if (double.TryParse(expr, out var num)) return num;
            if (bool.TryParse(expr, out var b)) return b;
            return expr;
        }
        
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }

        private class EvaluateConfig
        {
            public string Expression { get; set; } = "";
        }
    }
}
