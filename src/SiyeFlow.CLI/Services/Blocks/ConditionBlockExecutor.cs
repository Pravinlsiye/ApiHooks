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
            Node node, 
            Dictionary<string, object>? inputs, 
            Interfaces.ExecutionContext context, 
            CancellationToken cancellationToken)
        {
            var config = GetConfig<ConditionConfig>(node);
            var expression = config.Expression;

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

            var outputs = new Dictionary<string, object> { ["result"] = result };
            
            if (result) outputs["true"] = true;
            else outputs["false"] = false;

            return Task.FromResult(new BlockExecutionResult 
            { 
                Success = true,
                Outputs = outputs,
                NextHandle = result ? "true" : "false"
            });
        }
        
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            var config = GetConfig<ConditionConfig>(node);
            var result = new ValidationResult { IsValid = true };

            if (string.IsNullOrWhiteSpace(config.Expression))
            {
                result.IsValid = false;
                result.Errors.Add("Condition expression is required");
            }

            return Task.FromResult(result);
        }

        public class ConditionConfig
        {
            public string Expression { get; set; } = "";
        }
    }
}
