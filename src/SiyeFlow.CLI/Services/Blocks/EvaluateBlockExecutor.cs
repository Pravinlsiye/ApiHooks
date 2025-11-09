using Microsoft.Extensions.Logging;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    /// <summary>
    /// Executor for Evaluate blocks
    /// Supports evaluating expressions using JSONPath or JavaScript
    /// </summary>
    public class EvaluateBlockExecutor : BlockExecutorBase
    {
        private readonly IExpressionEvaluator _expressionEvaluator;

        public EvaluateBlockExecutor(
            ILogger<EvaluateBlockExecutor> logger, 
            IVariableStore variableStore, 
            IConsoleWriter console,
            IExpressionEvaluator expressionEvaluator) 
            : base(logger, variableStore, console) 
        {
            _expressionEvaluator = expressionEvaluator ?? throw new ArgumentNullException(nameof(expressionEvaluator));
        }
        
        public override BlockType BlockType => BlockType.Evaluate;
        
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(
            WorkflowBlock block, 
            Dictionary<string, object>? inputs, 
            Interfaces.ExecutionContext context, 
            CancellationToken cancellationToken)
        {
            var evaluateBlock = CastBlock<EvaluateBlock>(block);
            var config = evaluateBlock.Config;
            var language = config.Language?.ToLower() ?? "jsonpath";
            var expression = config.Expression;

            _console.Info($"Evaluating expression ({language}): {expression}");

            object? result = null;
            string? error = null;

            try
            {
                switch (language)
                {
                    case "jsonpath":
                        result = EvaluateJsonPath(expression, inputs, context);
                        break;
                    case "javascript":
                    case "js":
                        result = EvaluateJavaScript(expression, inputs, context);
                        break;
                    default:
                        throw new NotSupportedException($"Unsupported expression language: {language}");
                }

                _console.Success($"Expression evaluated successfully: {result}");

                // Output to success port
                var outputs = new Dictionary<string, object>
                {
                    ["result"] = result ?? new { },
                    ["success"] = result ?? new { }
                };

                return Task.FromResult(new BlockExecutionResult
                {
                    Success = true, // Always true - routing handled by ports
                    Outputs = outputs
                });
            }
            catch (Exception ex)
            {
                error = ex.Message;
                _console.Error($"Failed to evaluate expression: {error}");

                // Output to failure port
                var outputs = new Dictionary<string, object>
                {
                    ["error"] = error,
                    ["errorMessage"] = error,
                    ["failure"] = new { message = error, exception = ex.GetType().Name }
                };

                // Still return Success = true so executor checks for failure port connection
                return Task.FromResult(new BlockExecutionResult
                {
                    Success = true, // Don't stop workflow - let port connections handle routing
                    Error = error, // Store error for reference
                    Outputs = outputs
                });
            }
        }

        private object? EvaluateJsonPath(string expression, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context)
        {
            // Get data from inputs or variable store
            object? data = null;
            
            if (inputs != null && inputs.TryGetValue("data", out var inputData))
            {
                data = inputData;
            }
            else
            {
                // Try to get from variable store using the expression as a variable name
                data = _variableStore.GetVariable(expression);
            }

            if (data == null)
            {
                throw new InvalidOperationException($"No data available for JSONPath evaluation. Expression: {expression}");
            }

            // Use VariableStore's JSONPath evaluation
            var jsonPathResults = _variableStore.EvaluateJsonPathAsync(data, new Dictionary<string, string> { ["result"] = expression }).Result;
            
            if (jsonPathResults.TryGetValue("result", out var result))
            {
                return result;
            }

            return data;
        }

        private object? EvaluateJavaScript(string expression, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context)
        {
            // JavaScript evaluation is not yet implemented
            throw new NotSupportedException("JavaScript evaluation is not yet implemented. Use 'jsonpath' language instead.");
        }
        
        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            var result = new ValidationResult { IsValid = true };
            var evaluateBlock = CastBlock<EvaluateBlock>(block);

            if (string.IsNullOrWhiteSpace(evaluateBlock.Config.Expression))
            {
                result.IsValid = false;
                result.Errors.Add("Evaluate block expression is required");
            }

            var language = evaluateBlock.Config.Language?.ToLower() ?? "jsonpath";
            if (language != "jsonpath" && language != "javascript" && language != "js")
            {
                result.IsValid = false;
                result.Errors.Add($"Unsupported expression language: {language}. Supported: jsonpath, javascript");
            }

            // Validate that evaluate block has connections from success/failure ports
            if (evaluateBlock.Connections == null || !evaluateBlock.Connections.Any())
            {
                result.Warnings.Add("Evaluate block has no output connections");
            }
            else
            {
                var hasSuccessConnection = evaluateBlock.Connections.Any(c => c.FromPort == "success");
                var hasFailureConnection = evaluateBlock.Connections.Any(c => c.FromPort == "failure");
                
                if (!hasSuccessConnection)
                {
                    result.Warnings.Add("No connection from 'success' port - success results will be ignored");
                }
                if (!hasFailureConnection)
                {
                    result.Warnings.Add("No connection from 'failure' port - evaluation errors will stop the workflow");
                }
            }

            return Task.FromResult(result);
        }
    }
}

