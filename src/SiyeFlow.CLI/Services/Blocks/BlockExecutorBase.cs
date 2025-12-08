using Microsoft.Extensions.Logging;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    /// <summary>
    /// Base class for all block executors
    /// </summary>
    public abstract class BlockExecutorBase : IBlockExecutor
    {
        protected readonly ILogger _logger;
        protected readonly IVariableStore _variableStore;
        protected readonly IConsoleWriter _console;

        protected BlockExecutorBase(
            ILogger logger,
            IVariableStore variableStore,
            IConsoleWriter console)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _variableStore = variableStore ?? throw new ArgumentNullException(nameof(variableStore));
            _console = console ?? throw new ArgumentNullException(nameof(console));
        }

        public abstract BlockType BlockType { get; }

        public async Task<BlockExecutionResult> ExecuteAsync(
            Node node,
            Interfaces.ExecutionContext context,
            CancellationToken cancellationToken = default)
        {
            var stopwatch = Stopwatch.StartNew();
            var result = new BlockExecutionResult();

            try
            {
                // Log execution start
                _console.Info($"Executing {BlockType} block: {node.Label ?? node.Id}");
                _logger.LogDebug("Starting execution of block {BlockId} ({BlockType})", node.Id, BlockType);

                // Validate block
                var validation = await ValidateAsync(node, context);
                if (!validation.IsValid)
                {
                    throw new InvalidOperationException(
                        $"Block validation failed: {string.Join(", ", validation.Errors)}");
                }

                // Get inputs from port connections (stored in context by WorkflowExecutor)
                // In V2, inputs are typically injected into node.Data, but we keep this for compatibility
                var processedInputs = context.BlockInputs ?? new Dictionary<string, object>();

                // Execute the specific block logic
                result = await ExecuteInternalAsync(node, processedInputs, context, cancellationToken);

                // Process outputs
                if (result.Success && result.Outputs != null)
                {
                    // Outputs are stored by WorkflowExecutor
                }

                _console.Success($"Completed {BlockType} block: {node.Label ?? node.Id}");
            }
            catch (OperationCanceledException)
            {
                result.Success = false;
                result.Error = "Operation cancelled";
                _console.Warning($"Cancelled {BlockType} block: {node.Label ?? node.Id}");
                throw;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Error = ex.Message;
                _console.Error($"Failed {BlockType} block: {node.Label ?? node.Id} - {ex.Message}");
                _logger.LogError(ex, "Error executing block {BlockId}", node.Id);
            }
            finally
            {
                stopwatch.Stop();
                result.Duration = stopwatch.Elapsed;
            }

            return result;
        }

        public abstract Task<ValidationResult> ValidateAsync(
            Node node,
            Interfaces.ExecutionContext context);

        protected abstract Task<BlockExecutionResult> ExecuteInternalAsync(
            Node node,
            Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context,
            CancellationToken cancellationToken);

        protected T GetConfig<T>(Node node)
        {
            if (node.Data == null) return default!;
            return node.Data.ToObject<T>()!;
        }
    }
}
