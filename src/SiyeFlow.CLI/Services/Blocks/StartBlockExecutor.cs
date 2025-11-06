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
            var effectiveInputs = GetEffectiveInputs(startBlock.Config, inputs, context);
            
            foreach (var (inputName, value) in effectiveInputs)
            {
                outputs[inputName] = value;
                _variableStore.SetVariable(inputName, value);
                _variableStore.SetVariable($"inputs.{inputName}", value); // Also store with prefix for backward compatibility
                context.Variables[inputName] = value;
                context.Variables[$"inputs.{inputName}"] = value;
                
                _console.Debug($"Input '{inputName}': {value}");
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

        private Dictionary<string, object> GetEffectiveInputs(
            StartConfig? config, 
            Dictionary<string, object>? runtimeInputs,
            Interfaces.ExecutionContext context)
        {
            var result = new Dictionary<string, object>();
            var selectedInputDefinitions = new Dictionary<string, InputDefinition>();
            
            if (config == null) return result;
            
            // 1. Get inputs from selected profile
            if (config.Profiles != null && config.Profiles.Any())
            {
                InputProfile? selectedProfile = null;
                string? profileName = config.SelectedProfile;
                
                // Check if profile is specified in runtime inputs
                if (runtimeInputs?.ContainsKey("$selectedProfile") == true)
                {
                    profileName = runtimeInputs["$selectedProfile"]?.ToString();
                }
                // Also check in context variables
                else if (context.Variables.ContainsKey("inputs.$selectedProfile"))
                {
                    profileName = context.Variables["inputs.$selectedProfile"]?.ToString();
                }
                
                // Try to find the selected profile
                if (!string.IsNullOrEmpty(profileName))
                {
                    selectedProfile = config.Profiles.FirstOrDefault(p => p.Name == profileName);
                    if (selectedProfile != null)
                    {
                        _console.Info($"Using profile: {selectedProfile.Name}");
                    }
                    else
                    {
                        _console.Warning($"Profile '{profileName}' not found");
                    }
                }
                
                // If no profile selected or not found, use default
                if (selectedProfile == null)
                {
                    selectedProfile = config.Profiles.FirstOrDefault(p => p.Default);
                    if (selectedProfile != null)
                    {
                        _console.Info($"Using default profile: {selectedProfile.Name}");
                    }
                }
                
                // If still no profile, use the first one
                if (selectedProfile == null && config.Profiles.Any())
                {
                    selectedProfile = config.Profiles.First();
                    _console.Info($"Using first available profile: {selectedProfile.Name}");
                }
                
                // Copy profile inputs
                if (selectedProfile != null)
                {
                    foreach (var (key, input) in selectedProfile.Inputs)
                    {
                        selectedInputDefinitions[key] = input;
                        if (input.Value != null)
                        {
                            result[key] = input.Value;
                        }
                        else if (input.Default != null)
                        {
                            result[key] = input.Default;
                        }
                    }
                }
            }
            
            // 2. Apply legacy inputs if no profiles
            if (!selectedInputDefinitions.Any() && config.Inputs != null)
            {
                selectedInputDefinitions = config.Inputs;
                foreach (var (key, input) in config.Inputs)
                {
                    if (input.Default != null)
                    {
                        result[key] = input.Default;
                    }
                }
            }
            
            // 3. Apply overrides from config
            if (config.Overrides != null)
            {
                foreach (var (key, value) in config.Overrides)
                {
                    result[key] = value;
                    _console.Debug($"Applied override: {key} = {value}");
                }
            }
            
            // 4. Apply runtime inputs (highest priority)
            if (runtimeInputs != null)
            {
                foreach (var (key, value) in runtimeInputs)
                {
                    result[key] = value;
                    _console.Debug($"Applied runtime input: {key} = {value}");
                }
            }
            
            // 5. Check context variables for any additional inputs
            foreach (var (key, inputDef) in selectedInputDefinitions)
            {
                if (!result.ContainsKey(key))
                {
                    // Check if value provided in context
                    if (context.Variables.ContainsKey($"inputs.{key}"))
                    {
                        result[key] = context.Variables[$"inputs.{key}"];
                    }
                    else if (context.Variables.ContainsKey(key))
                    {
                        result[key] = context.Variables[key];
                    }
                }
            }
            
            // 6. Validate required inputs and type
            foreach (var (key, inputDef) in selectedInputDefinitions)
            {
                if (inputDef.Required && !result.ContainsKey(key))
                {
                    throw new InvalidOperationException($"Required input '{key}' not provided");
                }
                
                if (result.ContainsKey(key) && !ValidateType(result[key], inputDef.Type))
                {
                    _console.Warning($"Input '{key}' type mismatch. Expected: {inputDef.Type}");
                }
            }
            
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
