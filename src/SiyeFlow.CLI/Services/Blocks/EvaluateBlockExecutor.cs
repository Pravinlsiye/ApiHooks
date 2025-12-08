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
            Node node, 
            Dictionary<string, object>? inputs, 
            Interfaces.ExecutionContext context, 
            CancellationToken cancellationToken)
        {
            var config = GetConfig<EvaluateConfig>(node);
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
                    default:
                        throw new NotSupportedException($"Unsupported expression language: {language}");
                }

                _console.Success($"Expression evaluated successfully: {result}");

                var outputs = new Dictionary<string, object>
                {
                    ["result"] = result ?? new { },
                    ["success"] = result ?? new { }
                };

                return Task.FromResult(new BlockExecutionResult
                {
                    Success = true,
                    Outputs = outputs,
                    NextHandle = "success"
                });
            }
            catch (Exception ex)
            {
                error = ex.Message;
                _console.Error($"Failed to evaluate expression: {error}");

                var outputs = new Dictionary<string, object>
                {
                    ["error"] = error,
                    ["failure"] = new { message = error }
                };

                return Task.FromResult(new BlockExecutionResult
                {
                    Success = true,
                    Error = error,
                    Outputs = outputs,
                    NextHandle = "failure"
                });
            }
        }

        private object? EvaluateJsonPath(string expression, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context)
        {
            object? data = null;
            if (inputs != null && inputs.TryGetValue("data", out var inputData))
            {
                data = inputData;
            }
            else
            {
                data = _variableStore.GetVariable(expression);
            }

            if (data == null) throw new InvalidOperationException($"No data available for JSONPath evaluation.");

            var jsonPathResults = _variableStore.EvaluateJsonPathAsync(data, new Dictionary<string, string> { ["result"] = expression }).Result;
            return jsonPathResults.TryGetValue("result", out var result) ? result : data;
        }
        
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            var config = GetConfig<EvaluateConfig>(node);
            var result = new ValidationResult { IsValid = true };

            if (string.IsNullOrWhiteSpace(config.Expression))
            {
                result.IsValid = false;
                result.Errors.Add("Evaluate block expression is required");
            }

            return Task.FromResult(result);
        }

        public class EvaluateConfig
        {
            public string Language { get; set; } = "jsonpath";
            public string Expression { get; set; } = "";
        }
    }
}
