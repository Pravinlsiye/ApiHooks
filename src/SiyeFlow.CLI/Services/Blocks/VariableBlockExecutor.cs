using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
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
        
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(WorkflowBlock block, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            var variableBlock = CastBlock<VariableBlock>(block);
            var operation = variableBlock.Config.Operation?.ToLower() ?? "set";
            var outputs = new Dictionary<string, object>();

            switch (operation)
            {
                case "set":
                    foreach (var kvp in variableBlock.Config.Variables)
                    {
                        object value;
                        if (kvp.Value is string strValue)
                        {
                            // Replace variables in string values
                            value = _variableStore.ReplaceVariables(strValue);
                        }
                        else
                        {
                            // Keep objects/arrays as-is
                            value = kvp.Value;
                        }
                        
                        _variableStore.SetVariable(kvp.Key, value);
                        outputs[kvp.Key] = value;
                        _console.Info($"Set variable '{kvp.Key}' = {JsonConvert.SerializeObject(value)}");
                    }
                    break;

                case "get":
                    foreach (var kvp in variableBlock.Config.Variables)
                    {
                        var varName = kvp.Key;
                        var value = _variableStore.GetVariable(varName);
                        outputs[varName] = value ?? null!;
                        _console.Info($"Get variable '{varName}' = {JsonConvert.SerializeObject(value)}");
                    }
                    break;

                case "delete":
                    foreach (var kvp in variableBlock.Config.Variables)
                    {
                        var varName = kvp.Key;
                        _variableStore.SetVariable(varName, null!);
                        _console.Info($"Deleted variable '{varName}'");
                    }
                    break;

                default:
                    _console.Error($"Unknown variable operation: {operation}");
                    return Task.FromResult(new BlockExecutionResult { Success = false });
            }

            return Task.FromResult(new BlockExecutionResult 
            { 
                Success = true,
                Outputs = outputs
            });
        }
        
        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            var result = new ValidationResult { IsValid = true };
            var variableBlock = CastBlock<VariableBlock>(block);
            var operation = variableBlock.Config.Operation?.ToLower() ?? "set";

            var validOperations = new[] { "set", "get", "delete" };
            if (!validOperations.Contains(operation))
            {
                result.IsValid = false;
                result.Errors.Add($"Invalid variable operation: {operation}. Must be one of: set, get, delete");
            }

            if (variableBlock.Config.Variables == null || !variableBlock.Config.Variables.Any())
            {
                result.IsValid = false;
                result.Errors.Add("Variable block must have at least one variable");
            }

            return Task.FromResult(result);
        }
    }
}
