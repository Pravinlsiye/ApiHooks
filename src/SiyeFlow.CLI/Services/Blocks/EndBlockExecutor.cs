using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    public class EndBlockExecutor : BlockExecutorBase
    {
        public EndBlockExecutor(
            ILogger<EndBlockExecutor> logger,
            IVariableStore variableStore,
            IConsoleWriter console)
            : base(logger, variableStore, console)
        {
        }

        public override BlockType BlockType => BlockType.End;

        protected override async Task<BlockExecutionResult> ExecuteInternalAsync(
            Node node,
            Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context,
            CancellationToken cancellationToken)
        {
            var result = new BlockExecutionResult { Success = true };
            var outputs = new Dictionary<string, object>();

            _console.Info("=== Workflow Completed ===");

            var outputsToken = node.Data?["outputs"];
            if (outputsToken is JObject outputsObj)
            {
                foreach (var prop in outputsObj.Properties())
                {
                    var outputName = prop.Name;
                    object? processedValue;

                    if (prop.Value.Type == JTokenType.Object)
                    {
                        // Structured: { value: "...", type: "..." }
                        var def = prop.Value.ToObject<JObject>();
                        var rawValue = def?["value"]?.ToString();
                        if (rawValue != null)
                        {
                            processedValue = _variableStore.ReplaceVariables(rawValue);
                        }
                        else
                        {
                            processedValue = prop.Value.ToObject<object>();
                        }
                    }
                    else
                    {
                        // Simple string value: "{{variable}}" or literal
                        var rawValue = prop.Value.ToString();
                        processedValue = _variableStore.ReplaceVariables(rawValue);
                    }

                    outputs[outputName] = processedValue ?? "";
                    _console.Debug($"Output '{outputName}': {processedValue}");
                }
            }

            outputs["$executionId"] = context.ExecutionId;
            outputs["$completedAt"] = DateTime.UtcNow;

            result.Outputs = outputs;
            _console.Success($"Workflow completed with {outputs.Count} outputs");

            return await Task.FromResult(result);
        }

        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }
}
