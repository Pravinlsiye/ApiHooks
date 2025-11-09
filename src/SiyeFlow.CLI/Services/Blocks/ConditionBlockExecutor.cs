using Microsoft.Extensions.Logging;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    public class ConditionBlockExecutor : BlockExecutorBase
    {
        private readonly IExpressionEvaluator _expressionEvaluator;

        public ConditionBlockExecutor(
            ILogger<ConditionBlockExecutor> logger, 
            IVariableStore variableStore, 
            IConsoleWriter console,
            IExpressionEvaluator expressionEvaluator) 
            : base(logger, variableStore, console) 
        { 
            _expressionEvaluator = expressionEvaluator;
        }
        
        public override BlockType BlockType => BlockType.Condition;
        
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(
            WorkflowBlock block, 
            Dictionary<string, object>? inputs, 
            Interfaces.ExecutionContext context, 
            CancellationToken cancellationToken)
        {
            var conditionBlock = CastBlock<ConditionBlock>(block);
            var expression = conditionBlock.Config.Expression;

            _console.Info($"Evaluating condition: {expression}");

            bool result;
            try
            {
                result = _expressionEvaluator.EvaluateCondition(expression, inputs);
            }
            catch (Exception ex)
            {
                _console.Error($"Failed to evaluate condition: {ex.Message}");
                return Task.FromResult(new BlockExecutionResult 
                { 
                    Success = false,
                    Error = ex.Message 
                });
            }

            _console.Info($"Condition result: {result}");

            // Output to the appropriate port based on condition result
            var outputs = new Dictionary<string, object>
            {
                ["result"] = result
            };
            
            // Output to "true" or "false" port based on condition
            // The execution engine will follow connections from the port that has output
            if (result)
            {
                outputs["true"] = true;
            }
            else
            {
                outputs["false"] = false;
            }

            var executionResult = new BlockExecutionResult 
            { 
                Success = true,
                Outputs = outputs
            };

            return Task.FromResult(executionResult);
        }
        
        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            var result = new ValidationResult { IsValid = true };
            var conditionBlock = CastBlock<ConditionBlock>(block);

            if (string.IsNullOrWhiteSpace(conditionBlock.Config.Expression))
            {
                result.IsValid = false;
                result.Errors.Add("Condition expression is required");
            }

            // Validate that condition block has connections from true/false ports
            if (conditionBlock.Connections == null || !conditionBlock.Connections.Any())
            {
                result.Warnings.Add("Condition block has no output connections");
            }
            else
            {
                var hasTrueConnection = conditionBlock.Connections.Any(c => c.FromPort == "true");
                var hasFalseConnection = conditionBlock.Connections.Any(c => c.FromPort == "false");
                
                if (!hasTrueConnection)
                {
                    result.Warnings.Add("No connection from 'true' port");
                }
                if (!hasFalseConnection)
                {
                    result.Warnings.Add("No connection from 'false' port");
                }
            }

            return Task.FromResult(result);
        }
    }
}
