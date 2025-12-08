using Microsoft.Extensions.Logging;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    // Stub implementations to enable testing

    public class LogBlockExecutor : BlockExecutorBase
    {
        public LogBlockExecutor(ILogger<LogBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.Log;
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(Node node, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            var config = GetConfig<LogConfig>(node);
            var message = config.Message ?? "";
            
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
            
            message = _variableStore.ReplaceVariables(message);
            
            _console.Info($"LOG [{config.Level ?? "info"}]: {message}");
            
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
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }

        public class LogConfig
        {
            public string Message { get; set; } = "";
            public string Level { get; set; } = "info";
        }
    }

    public class DelayBlockExecutor : BlockExecutorBase
    {
        public DelayBlockExecutor(ILogger<DelayBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.Delay;
        protected override async Task<BlockExecutionResult> ExecuteInternalAsync(Node node, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            var config = GetConfig<DelayConfig>(node);
            _console.Info($"Delaying for {config.Duration} {config.Unit}...");
            
            // Implement actual delay if needed, for now just log
            // await Task.Delay(TimeSpan.FromMilliseconds(config.Duration)); 
            
            return await Task.FromResult(new BlockExecutionResult { Success = true });
        }
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }

        public class DelayConfig
        {
            public int Duration { get; set; }
            public string Unit { get; set; } = "milliseconds";
        }
    }

    public class LoopBlockExecutor : BlockExecutorBase
    {
        public LoopBlockExecutor(ILogger<LoopBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.Loop;
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(Node node, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            _console.Warning($"Loop block not yet fully implemented");
            return Task.FromResult(new BlockExecutionResult { Success = true });
        }
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }

    public class TryCatchBlockExecutor : BlockExecutorBase
    {
        public TryCatchBlockExecutor(ILogger<TryCatchBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.TryCatch;
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(Node node, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            _console.Warning($"TryCatch block not yet fully implemented");
            return Task.FromResult(new BlockExecutionResult { Success = true });
        }
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }

    public class CollectBlockExecutor : BlockExecutorBase
    {
        public CollectBlockExecutor(ILogger<CollectBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.Collect;
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(Node node, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            _console.Warning($"Collect block not yet fully implemented");
            return Task.FromResult(new BlockExecutionResult { Success = true });
        }
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }

    public class SubWorkflowBlockExecutor : BlockExecutorBase
    {
        public SubWorkflowBlockExecutor(ILogger<SubWorkflowBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console) 
            : base(logger, variableStore, console) { }
        public override BlockType BlockType => BlockType.SubWorkflow;
        protected override Task<BlockExecutionResult> ExecuteInternalAsync(Node node, Dictionary<string, object>? inputs, Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            _console.Warning($"SubWorkflow block not yet fully implemented");
            return Task.FromResult(new BlockExecutionResult { Success = true });
        }
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
    }
}
