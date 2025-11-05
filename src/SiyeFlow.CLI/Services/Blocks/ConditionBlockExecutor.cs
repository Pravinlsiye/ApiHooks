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

            var outputs = new Dictionary<string, object>
            {
                ["result"] = result,
                ["nextBlock"] = result ? conditionBlock.Config.OnTrue : conditionBlock.Config.OnFalse
            };

            // Override the normal flow - use OnTrue or OnFalse instead of OnSuccess
            var executionResult = new BlockExecutionResult 
            { 
                Success = true,
                Outputs = outputs,
                NextBlockId = result ? conditionBlock.Config.OnTrue : conditionBlock.Config.OnFalse
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

            if (string.IsNullOrWhiteSpace(conditionBlock.Config.OnTrue))
            {
                result.Warnings.Add("No onTrue branch specified");
            }

            if (string.IsNullOrWhiteSpace(conditionBlock.Config.OnFalse))
            {
                result.Warnings.Add("No onFalse branch specified");
            }

            return Task.FromResult(result);
        }
    }
}
