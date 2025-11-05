using Microsoft.Extensions.Logging;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    /// <summary>
    /// Executor for Start blocks
    /// </summary>
    public class StartBlockExecutor : BlockExecutorBase
    {
        public StartBlockExecutor(
            ILogger<StartBlockExecutor> logger,
            IVariableStore variableStore,
            IConsoleWriter console) 
            : base(logger, variableStore, console)
        {
        }

        public override BlockType BlockType => BlockType.Start;

        protected override async Task<BlockExecutionResult> ExecuteInternalAsync(
            WorkflowBlock block,
            Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context,
            CancellationToken cancellationToken)
        {
            var startBlock = CastBlock<StartBlock>(block);
            var result = new BlockExecutionResult { Success = true };

            _console.Info("=== Workflow Started ===");
            
            // Process workflow inputs
            var outputs = new Dictionary<string, object>();
            
            if (startBlock.Config?.Inputs != null)
            {
                foreach (var inputDef in startBlock.Config.Inputs)
                {
                    var inputName = inputDef.Key;
                    var inputConfig = inputDef.Value;
                    object? value = null;

                    // Check if value provided in context
                    if (context.Variables.ContainsKey($"inputs.{inputName}"))
                    {
                        value = context.Variables[$"inputs.{inputName}"];
                    }
                    // Check if value provided in inputs parameter
                    else if (inputs != null && inputs.ContainsKey(inputName))
                    {
                        value = inputs[inputName];
                    }
                    // Use default value if available
                    else if (inputConfig.Default != null)
                    {
                        value = inputConfig.Default;
                    }
                    // Check if required
                    else if (inputConfig.Required)
                    {
                        throw new InvalidOperationException(
                            $"Required input '{inputName}' not provided");
                    }

                    // Validate type (basic validation)
                    if (value != null)
                    {
                        if (!ValidateType(value, inputConfig.Type))
                        {
                            _console.Warning($"Input '{inputName}' type mismatch. Expected: {inputConfig.Type}");
                        }
                    }

                    // Store in outputs and variables
                    if (value != null)
                    {
                        outputs[inputName] = value;
                        _variableStore.SetVariable(inputName, value);
                        _variableStore.SetVariable($"inputs.{inputName}", value); // Also store with prefix for backward compatibility
                        context.Variables[inputName] = value;
                        context.Variables[$"inputs.{inputName}"] = value;
                        
                        _console.Debug($"Input '{inputName}': {value}");
                    }
                }
            }

            // Add system variables
            outputs["$timestamp"] = DateTime.UtcNow;
            outputs["$workflowId"] = context.WorkflowId;
            outputs["$executionId"] = context.ExecutionId;
            
            _variableStore.SetVariable("$timestamp", outputs["$timestamp"]);
            _variableStore.SetVariable("$workflowId", outputs["$workflowId"]);
            _variableStore.SetVariable("$executionId", outputs["$executionId"]);

            result.Outputs = outputs;
            
            _console.Success($"Initialized workflow with {outputs.Count} inputs");
            
            return result;
        }

        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            var result = new ValidationResult { IsValid = true };

            try
            {
                var startBlock = CastBlock<StartBlock>(block);
                
                // Start block should have only one output connection
                if (string.IsNullOrEmpty(block.OnSuccess))
                {
                    result.IsValid = false;
                    result.Errors.Add("Start block must have an onSuccess connection");
                }

                // Validate input definitions
                if (startBlock.Config?.Inputs != null)
                {
                    foreach (var input in startBlock.Config.Inputs)
                    {
                        if (string.IsNullOrEmpty(input.Key))
                        {
                            result.IsValid = false;
                            result.Errors.Add("Input name cannot be empty");
                        }

                        if (string.IsNullOrEmpty(input.Value.Type))
                        {
                            result.IsValid = false;
                            result.Errors.Add($"Input '{input.Key}' must have a type");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                result.IsValid = false;
                result.Errors.Add($"Invalid Start block configuration: {ex.Message}");
            }

            return Task.FromResult(result);
        }

        private bool ValidateType(object value, string expectedType)
        {
            return expectedType.ToLower() switch
            {
                "string" => value is string,
                "number" => value is int or long or float or double or decimal,
                "boolean" => value is bool,
                "object" => value is not null,
                "array" => value is System.Collections.IEnumerable,
                _ => true // Unknown type, allow
            };
        }
    }
}
