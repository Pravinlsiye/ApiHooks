using Microsoft.Extensions.Logging;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    // Temporary stub implementations to enable testing

    // Stub - implementation moved to VariableBlockExecutor.cs

    public class LogBlockExecutor : BlockExecutorBase
    {
        public LogBlockExecutor(ILogger<LogBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.Log;
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(WorkflowBlock block, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            var logBlock = CastBlock<LogBlock>(block);
            var config = logBlock.Config;
            var message = config.Message ?? "";
            
            // Replace variables in message from inputs
            if (inputs != null)
            {
                foreach (var input in inputs)
                {
                    var placeholder = $"{{{{{input.Key}}}}}";
                    if (message.Contains(placeholder))
                    {
                        var value = input.Value?.ToString() ?? "";
                        message = message.Replace(placeholder, value);
                    }
                }
            }
            
            // Also check variable store for any remaining variables
            message = _variableStore.ReplaceVariables(message);
            
            _console.Info($"LOG [{config.Level ?? "info"}]: {message}");
            
            // Output "complete" port so workflow can continue to End block
            return Task.FromResult(new BlockExecutionResult 
            { 
                Success = true,
                Outputs = new Dictionary<string, object>
                {
                    ["complete"] = true,
                    ["message"] = message
                }
            });
        }
        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }

    public class DelayBlockExecutor : BlockExecutorBase
    {
        public DelayBlockExecutor(ILogger<DelayBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.Delay;
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(WorkflowBlock block, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            _console.Warning($"Delay block not yet implemented");
            return Task.FromResult(new BlockExecutionResult { Success = true });
        }
        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }

    // Stub - implementation moved to ConditionBlockExecutor.cs

    public class LoopBlockExecutor : BlockExecutorBase
    {
        public LoopBlockExecutor(ILogger<LoopBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.Loop;
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(WorkflowBlock block, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            _console.Warning($"Loop block not yet implemented");
            return Task.FromResult(new BlockExecutionResult { Success = true });
        }
        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }

    public class TryCatchBlockExecutor : BlockExecutorBase
    {
        public TryCatchBlockExecutor(ILogger<TryCatchBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.TryCatch;
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(WorkflowBlock block, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            _console.Warning($"TryCatch block not yet implemented");
            return Task.FromResult(new BlockExecutionResult { Success = true });
        }
        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }

    public class CollectBlockExecutor : BlockExecutorBase
    {
        public CollectBlockExecutor(ILogger<CollectBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.Collect;
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(WorkflowBlock block, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            _console.Warning($"Collect block not yet implemented");
            return Task.FromResult(new BlockExecutionResult { Success = true });
        }
        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }

    public class SubWorkflowBlockExecutor : BlockExecutorBase
    {
        public SubWorkflowBlockExecutor(ILogger<SubWorkflowBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.Workflow;
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(WorkflowBlock block, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            _console.Warning($"SubWorkflow block not yet implemented");
            return Task.FromResult(new BlockExecutionResult { Success = true });
        }
        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }
}
