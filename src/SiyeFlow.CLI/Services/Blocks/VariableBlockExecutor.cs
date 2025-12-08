using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    public class VariableBlockExecutor : BlockExecutorBase
    {
        public VariableBlockExecutor(ILogger<VariableBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        
        public override BlockType BlockType => BlockType.Variable;
        
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(
            Node node,
            Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context,
            CancellationToken cancellationToken)
        {
            var config = GetConfig<VariableConfig>(node);
            var operation = config.Operation?.ToLower() ?? "set";
            var outputs = new Dictionary<string, object>();

            // Store port inputs into variable store
            if (inputs != null)
            {
                foreach (var input in inputs)
                {
                    _variableStore.SetVariable(input.Key, input.Value);
                }
            }

            if (config.Values != null)
            {
                switch (operation)
                {
                    case "set":
                        foreach (var kvp in config.Values)
                        {
                            object value;
                            if (kvp.Value is JValue jVal && jVal.Type == JTokenType.String)
                            {
                                value = _variableStore.ReplaceVariables(jVal.ToString());
                            }
                            else if (kvp.Value is string strValue)
                            {
                                value = _variableStore.ReplaceVariables(strValue);
                            }
                            else
                            {
                                value = kvp.Value;
                            }
                            
                            _variableStore.SetVariable(kvp.Key, value);
                            outputs[kvp.Key] = value;
                            _console.Info($"Set variable '{kvp.Key}' = {value}");
                        }
                        break;

                    case "delete":
                        foreach (var kvp in config.Values)
                        {
                            _variableStore.SetVariable(kvp.Key, null!);
                            _console.Info($"Deleted variable '{kvp.Key}'");
                        }
                        break;
                }
            }

            return Task.FromResult(new BlockExecutionResult 
            { 
                Success = true,
                Outputs = outputs
            });
        }
        
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            var config = GetConfig<VariableConfig>(node);
            var result = new ValidationResult { IsValid = true };

            if (config.Values == null || !config.Values.Any())
            {
                result.IsValid = false;
                result.Errors.Add("Variable block must have values defined.");
            }

            return Task.FromResult(result);
        }

        // DTOs
        public class VariableConfig
        {
            public string Operation { get; set; } = "set";
            public Dictionary<string, object>? Values { get; set; }
        }
    }
}
