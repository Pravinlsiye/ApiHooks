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
            
            // Process workflow inputs from WorkflowInputs context
            var outputs = new Dictionary<string, object>();
            var effectiveInputs = GetEffectiveInputs(startBlock.Config, context.WorkflowInputs, context);
            
            foreach (var (inputName, value) in effectiveInputs)
            {
                // Outputs are keyed by port name (input name matches port name)
                outputs[inputName] = value;
                _console.Debug($"Input '{inputName}': {value}");
            }

            // Add system variables
            outputs["$timestamp"] = DateTime.UtcNow;
            outputs["$workflowId"] = context.WorkflowId;
            outputs["$executionId"] = context.ExecutionId;

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
            
            // Get inputs from selected profile
            if (config.Profiles != null && config.Profiles.Any())
            {
                InputProfile? selectedProfile = null;
                string? profileName = config.SelectedProfile;
                
                // Check if profile is specified in runtime inputs
                if (runtimeInputs?.ContainsKey("$selectedProfile") == true)
                {
                    profileName = runtimeInputs["$selectedProfile"]?.ToString();
                }
                
                // Find the selected profile
                if (!string.IsNullOrEmpty(profileName))
                {
                    selectedProfile = config.Profiles.FirstOrDefault(p => p.Name == profileName);
                    if (selectedProfile != null)
                    {
                        _console.Info($"Using profile: {selectedProfile.Name}");
                    }
                }
                
                // Use default profile if none selected
                if (selectedProfile == null)
                {
                    selectedProfile = config.Profiles.FirstOrDefault(p => p.Default) ?? config.Profiles.First();
                    if (selectedProfile != null)
                    {
                        _console.Info($"Using profile: {selectedProfile.Name}");
                    }
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
            // Fall back to direct inputs format if no profiles
            else if (config.Inputs != null && config.Inputs.Any())
            {
                selectedInputDefinitions = config.Inputs;
                foreach (var (key, input) in config.Inputs)
                {
                    // Support both "value" and "default" properties
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
            
            // Apply overrides from config
            if (config.Overrides != null)
            {
                foreach (var (key, value) in config.Overrides)
                {
                    result[key] = value;
                    _console.Debug($"Applied override: {key} = {value}");
                }
            }
            
            // Apply runtime inputs (highest priority)
            if (runtimeInputs != null)
            {
                foreach (var (key, value) in runtimeInputs)
                {
                    if (key != "$selectedProfile") // Skip profile selector
                    {
                        result[key] = value;
                        _console.Debug($"Applied runtime input: {key} = {value}");
                    }
                }
            }
            
            // Validate required inputs
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
                
                // Start block must have either profiles or inputs
                if ((startBlock.Config?.Profiles == null || !startBlock.Config.Profiles.Any()) &&
                    (startBlock.Config?.Inputs == null || !startBlock.Config.Inputs.Any()))
                {
                    result.IsValid = false;
                    result.Errors.Add("Start block must have at least one profile or input definition");
                }

                // Start block should have output connections
                if (startBlock.Connections == null || !startBlock.Connections.Any())
                {
                    result.Warnings.Add("Start block has no output connections");
                }

                // Validate input definitions in profiles
                if (startBlock.Config?.Profiles != null)
                {
                    foreach (var profile in startBlock.Config.Profiles)
                    {
                        foreach (var input in profile.Inputs)
                        {
                            if (string.IsNullOrEmpty(input.Key))
                            {
                                result.IsValid = false;
                                result.Errors.Add($"Profile '{profile.Name}': Input name cannot be empty");
                            }

                            if (string.IsNullOrEmpty(input.Value.Type))
                            {
                                result.IsValid = false;
                                result.Errors.Add($"Profile '{profile.Name}': Input '{input.Key}' must have a type");
                            }
                        }
                    }
                }
                
                // Validate inputs if no profiles
                if (startBlock.Config?.Inputs != null && (startBlock.Config?.Profiles == null || !startBlock.Config.Profiles.Any()))
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
