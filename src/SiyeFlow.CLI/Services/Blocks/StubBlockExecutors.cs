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
            var message = _variableStore.ReplaceVariables(config.Message ?? "");
            var level = (config.Level ?? "info").ToLowerInvariant();

            switch (level)
            {
                case "error":
                    _console.Error(message);
                    break;
                case "warning":
                case "warn":
                    _console.Warning(message);
                    break;
                case "debug":
                    _console.Debug(message);
                    break;
                case "success":
                    _console.Success(message);
                    break;
                default:
                    _console.Info(message);
                    break;
            }

            return Task.FromResult(new BlockExecutionResult 
            { 
                Success = true,
                NextHandle = "success",
                Outputs = new Dictionary<string, object> { ["message"] = message }
            });
        }
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
            => Task.FromResult(new ValidationResult { IsValid = true });

        private class LogConfig
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
            var duration = config.Duration;

            var ms = config.Unit?.ToLowerInvariant() switch
            {
                "seconds" => duration * 1000,
                "minutes" => duration * 60000,
                _ => duration
            };

            _console.Info($"Waiting {ms}ms...");
            await Task.Delay(ms, cancellationToken);

            return new BlockExecutionResult
            {
                Success = true,
                NextHandle = "success"
            };
        }
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
            => Task.FromResult(new ValidationResult { IsValid = true });

        private class DelayConfig
        {
            public int Duration { get; set; } = 1000;
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
            var config = GetConfig<LoopConfig>(node);
            var itemsRaw = _variableStore.ReplaceVariables(config.Items ?? "[]");

            List<object> items;
            try
            {
                var parsed = Newtonsoft.Json.JsonConvert.DeserializeObject<List<object>>(itemsRaw);
                items = parsed ?? new List<object>();
            }
            catch
            {
                items = itemsRaw.Split(',').Select(s => (object)s.Trim()).ToList();
            }

            _variableStore.SetVariable("loopItems", items);
            _variableStore.SetVariable("loopCount", items.Count);

            return Task.FromResult(new BlockExecutionResult
            {
                Success = true,
                NextHandle = "each",
                Outputs = new Dictionary<string, object>
                {
                    ["items"] = items,
                    ["count"] = items.Count
                }
            });
        }
        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
            => Task.FromResult(new ValidationResult { IsValid = true });

        private class LoopConfig
        {
            public string Items { get; set; } = "[]";
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
