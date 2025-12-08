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
            Node node,
            Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context,
            CancellationToken cancellationToken)
        {
            var config = GetConfig<StartConfig>(node);
            var result = new BlockExecutionResult { Success = true };

            _console.Info("=== Workflow Started ===");
            
            var outputs = new Dictionary<string, object>();
            var effectiveInputs = GetEffectiveInputs(config, context.WorkflowInputs);
            
            foreach (var (inputName, value) in effectiveInputs)
            {
                outputs[inputName] = value;
                _console.Debug($"Input '{inputName}': {value}");
            }

            // System variables
            outputs["$timestamp"] = DateTime.UtcNow;
            outputs["$workflowId"] = context.WorkflowId;
            outputs["$executionId"] = context.ExecutionId;

            result.Outputs = outputs;
            
            _console.Success($"Initialized workflow with {outputs.Count} inputs");
            
            return await Task.FromResult(result);
        }

        private Dictionary<string, object> GetEffectiveInputs(
            StartConfig config, 
            Dictionary<string, object>? runtimeInputs)
        {
            var result = new Dictionary<string, object>();
            
            if (config == null) return result;

            // 1. Get Default Profile
            Dictionary<string, object>? selectedProfileValues = null;
            
            // Determine active profile name
            string? profileName = config.SelectedProfile;
            if (runtimeInputs?.ContainsKey("$selectedProfile") == true)
            {
                profileName = runtimeInputs["$selectedProfile"]?.ToString();
            }

            if (config.Profiles != null)
            {
                // Find matching profile
                var profile = config.Profiles.FirstOrDefault(p => p.Name == profileName)
                           ?? config.Profiles.FirstOrDefault(p => p.Default)
                           ?? config.Profiles.FirstOrDefault();

                if (profile != null)
                {
                    selectedProfileValues = profile.Values;
                    _console.Info($"Using profile: {profile.Name}");
                }
            }

            // 2. Fill Defaults from Schema if value missing
            if (config.Inputs != null)
            {
                foreach (var (key, def) in config.Inputs)
                {
                    object? val = null;

                    // Priority 1: Runtime Override
                    if (runtimeInputs?.TryGetValue(key, out var runtimeVal) == true)
                    {
                        val = runtimeVal;
                    }
                    // Priority 2: Profile Value
                    else if (selectedProfileValues?.TryGetValue(key, out var profileVal) == true)
                    {
                        val = profileVal;
                    }
                    // Priority 3: Schema Default
                    else if (def.Default != null)
                    {
                        val = def.Default;
                    }

                    // Validation
                    if (def.Required && val == null)
                    {
                        throw new InvalidOperationException($"Required input '{key}' is missing.");
                    }

                    if (val != null)
                    {
                        result[key] = val;
                    }
                }
            }

            return result;
        }

        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            var config = GetConfig<StartConfig>(node);
            var result = new ValidationResult { IsValid = true };

            if (config.Inputs == null && config.Profiles == null)
            {
                result.IsValid = false;
                result.Errors.Add("Start block must have inputs or profiles defined.");
            }

            return Task.FromResult(result);
        }

        // DTOs
        public class StartConfig
        {
            public Dictionary<string, InputDefinition>? Inputs { get; set; }
            public List<ProfileDefinition>? Profiles { get; set; }
            public string? SelectedProfile { get; set; }
        }

        public class InputDefinition
        {
            public string Type { get; set; } = "string";
            public bool Required { get; set; }
            public object? Default { get; set; }
        }

        public class ProfileDefinition
        {
            public string Name { get; set; } = string.Empty;
            public bool Default { get; set; }
            public Dictionary<string, object> Values { get; set; } = new();
        }
    }
}
