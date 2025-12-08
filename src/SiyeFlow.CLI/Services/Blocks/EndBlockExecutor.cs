using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
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
            var config = GetConfig<EndConfig>(node);
            var result = new BlockExecutionResult { Success = true };

            _console.Info("=== Workflow Completed ===");

            var outputs = new Dictionary<string, object>();

            if (config.Outputs != null)
            {
                foreach (var outputDef in config.Outputs)
                {
                    var outputName = outputDef.Key;
                    var outputConfig = outputDef.Value;

                    object? processedValue;

                    if (outputConfig.Value == null) 
                    {
                        processedValue = null;
                    }
                    else if (outputConfig.Value.StartsWith("{{") && outputConfig.Value.EndsWith("}}"))
                    {
                        // Direct variable reference
                        var varName = outputConfig.Value.Trim('{', '}', ' ');
                        var value = _variableStore.GetVariable(varName);
                        processedValue = value ?? outputConfig.Value; // Fallback to string if not found
                    }
                    else
                    {
                        // Replace variables within string
                        var replacedValue = _variableStore.ReplaceVariables(outputConfig.Value);
                        processedValue = ParseValue(replacedValue, outputConfig.Type);
                    }

                    outputs[outputName] = processedValue ?? outputConfig.Value;
                    _console.Debug($"Output '{outputName}': {processedValue}");
                }
            }

            // System outputs
            outputs["$executionId"] = context.ExecutionId;
            outputs["$completedAt"] = DateTime.UtcNow;

            result.Outputs = outputs;
            
            _console.Success($"Workflow completed with {outputs.Count} outputs");

            return await Task.FromResult(result);
        }

        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            var result = new ValidationResult { IsValid = true };
            return Task.FromResult(result);
        }

        private object ParseValue(object value, string type)
        {
            if (value == null) return null!;
            var stringValue = value.ToString();

            return type?.ToLower() switch
            {
                "number" => double.TryParse(stringValue, out var d) ? d : value,
                "boolean" => bool.TryParse(stringValue, out var b) ? b : value,
                "integer" => int.TryParse(stringValue, out var i) ? i : value,
                _ => value
            };
        }

        // DTOs
        public class EndConfig
        {
            public Dictionary<string, OutputDefinition>? Outputs { get; set; }
        }

        public class OutputDefinition
        {
            public string Type { get; set; } = "string";
            public string? Value { get; set; }
        }
    }
}
