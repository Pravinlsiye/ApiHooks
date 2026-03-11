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
            var result = new BlockExecutionResult { Success = true, NextHandle = "default" };
            var outputs = new Dictionary<string, object>();

            _console.Info("=== Workflow Started ===");

            var data = node.Data;

            // Handle flat values: data.values = { "key": "value" }
            var valuesToken = data?["values"];
            if (valuesToken is JObject valuesObj)
            {
                foreach (var prop in valuesObj.Properties())
                {
                    var val = prop.Value.Type == JTokenType.Object || prop.Value.Type == JTokenType.Array
                        ? prop.Value.ToObject<object>()
                        : prop.Value.ToString();
                    outputs[prop.Name] = val!;
                    _variableStore.SetVariable(prop.Name, val!);
                    _console.Debug($"Variable '{prop.Name}': {val}");
                }
            }

            // Handle structured inputs: data.inputs = { "key": { "type": "string", "required": true } }
            var inputsToken = data?["inputs"];
            if (inputsToken is JObject inputsObj)
            {
                foreach (var prop in inputsObj.Properties())
                {
                    object? val = null;

                    // Check runtime inputs first
                    if (context.WorkflowInputs?.TryGetValue(prop.Name, out var runtimeVal) == true)
                    {
                        val = runtimeVal;
                    }
                    else if (prop.Value.Type == JTokenType.Object)
                    {
                        // Structured: { type, required, value/default }
                        var def = prop.Value.ToObject<JObject>();
                        val = def?["value"]?.ToObject<object>() ?? def?["default"]?.ToObject<object>();
                    }
                    else
                    {
                        val = prop.Value.ToObject<object>();
                    }

                    if (val != null)
                    {
                        outputs[prop.Name] = val;
                        _variableStore.SetVariable(prop.Name, val);
                        _console.Debug($"Input '{prop.Name}': {val}");
                    }
                }
            }

            // Handle profiles: data.profiles = [{ name, values }]
            var profilesToken = data?["profiles"];
            if (profilesToken is JArray profilesArray && profilesArray.Count > 0)
            {
                var selectedName = data?["selectedProfile"]?.ToString();
                var profile = profilesArray.FirstOrDefault(p => p["name"]?.ToString() == selectedName)
                           ?? profilesArray.First();

                var profileValues = profile["values"] as JObject;
                if (profileValues != null)
                {
                    _console.Info($"Using profile: {profile["name"]}");
                    foreach (var prop in profileValues.Properties())
                    {
                        var val = prop.Value.ToObject<object>();
                        if (val != null)
                        {
                            // Runtime inputs override profile values
                            if (context.WorkflowInputs?.TryGetValue(prop.Name, out var runtimeVal) == true)
                                val = runtimeVal;

                            outputs[prop.Name] = val;
                            _variableStore.SetVariable(prop.Name, val);
                            _console.Debug($"Profile '{prop.Name}': {val}");
                        }
                    }
                }
            }

            // System variables
            outputs["$timestamp"] = DateTime.UtcNow;
            outputs["$workflowId"] = context.WorkflowId;
            outputs["$executionId"] = context.ExecutionId;

            result.Outputs = outputs;
            _console.Success($"Initialized workflow with {outputs.Count} variables");

            return await Task.FromResult(result);
        }

        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }
}
