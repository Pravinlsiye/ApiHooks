using Microsoft.Extensions.Logging;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.CLI.Models;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    /// <summary>
    /// Executor for End blocks
    /// </summary>
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
            WorkflowBlock block,
            Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context,
            CancellationToken cancellationToken)
        {
            var endBlock = CastBlock<EndBlock>(block);
            var result = new BlockExecutionResult { Success = true };

            _console.Info("=== Workflow Completed ===");

            var outputs = new Dictionary<string, object>();

            if (endBlock.Config?.Outputs != null)
            {
                foreach (var outputDef in endBlock.Config.Outputs)
                {
                    var outputName = outputDef.Key;
                    var outputConfig = outputDef.Value;

                    // Replace variables in the output value
                    object? processedValue;

                    // Try to get the actual variable value
                    if (outputConfig.Value.StartsWith("{{") && outputConfig.Value.EndsWith("}}"))
                    {
                        var varName = outputConfig.Value.Trim('{', '}', ' ');
                        var value = _variableStore.GetVariable(varName);
                        if (value != null)
                        {
                            processedValue = value;
                        }
                        else
                        {
                            processedValue = outputConfig.Value;
                        }
                    }
                    else
                    {
                        // Replace variables and try to parse the value based on type
                        var replacedValue = _variableStore.ReplaceVariables(outputConfig.Value);
                        processedValue = ParseValue(replacedValue, outputConfig.Type);
                    }

                    outputs[outputName] = processedValue ?? outputConfig.Value;
                    
                    _console.Debug($"Output '{outputName}': {processedValue}");
                }
            }

            // Add execution metadata
            outputs["$executionPath"] = context.ExecutionPath;
            outputs["$executionId"] = context.ExecutionId;
            outputs["$completedAt"] = DateTime.UtcNow;

            result.Outputs = outputs;
            
            _console.Success($"Workflow completed with {outputs.Count} outputs");

            // No next block from End
            result.NextBlockId = null;
            
            return result;
        }

        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            var result = new ValidationResult { IsValid = true };

            try
            {
                var endBlock = CastBlock<EndBlock>(block);

                // End blocks should not have success/failure/complete connections
                if (!string.IsNullOrEmpty(block.OnSuccess))
                {
                    result.Warnings.Add("End block should not have an onSuccess connection");
                }
                if (!string.IsNullOrEmpty(block.OnFailure))
                {
                    result.Warnings.Add("End block should not have an onFailure connection");
                }
                if (!string.IsNullOrEmpty(block.OnComplete))
                {
                    result.Warnings.Add("End block should not have an onComplete connection");
                }

                // Validate output definitions
                if (endBlock.Config?.Outputs != null)
                {
                    foreach (var output in endBlock.Config.Outputs)
                    {
                        if (string.IsNullOrEmpty(output.Key))
                        {
                            result.IsValid = false;
                            result.Errors.Add("Output name cannot be empty");
                        }

                        if (string.IsNullOrEmpty(output.Value.Type))
                        {
                            result.IsValid = false;
                            result.Errors.Add($"Output '{output.Key}' must have a type");
                        }

                        if (string.IsNullOrEmpty(output.Value.Value))
                        {
                            result.IsValid = false;
                            result.Errors.Add($"Output '{output.Key}' must have a value");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                result.IsValid = false;
                result.Errors.Add($"Invalid End block configuration: {ex.Message}");
            }

            return Task.FromResult(result);
        }

        private object ParseValue(object value, string type)
        {
            if (value == null)
                return null!;

            var stringValue = value.ToString();

            return type.ToLower() switch
            {
                "number" => double.TryParse(stringValue, out var d) ? d : value,
                "boolean" => bool.TryParse(stringValue, out var b) ? b : value,
                "integer" => int.TryParse(stringValue, out var i) ? i : value,
                _ => value
            };
        }
    }
}
