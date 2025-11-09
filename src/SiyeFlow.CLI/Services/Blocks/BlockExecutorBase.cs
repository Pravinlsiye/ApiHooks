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
            WorkflowBlock block,
            Interfaces.ExecutionContext context,
            CancellationToken cancellationToken = default)
        {
            var stopwatch = Stopwatch.StartNew();
            var result = new BlockExecutionResult();

            try
            {
                // Log execution start
                _console.Info($"Executing {BlockType} block: {block.Name}");
                _logger.LogDebug("Starting execution of block {BlockId} ({BlockType})", block.Id, BlockType);

                // Validate block
                var validation = await ValidateAsync(block, context);
                if (!validation.IsValid)
                {
                    throw new InvalidOperationException(
                        $"Block validation failed: {string.Join(", ", validation.Errors)}");
                }

                // Get inputs from port connections (stored in context by WorkflowExecutor)
                var processedInputs = context.BlockInputs ?? new Dictionary<string, object>();

                // Execute the specific block logic
                result = await ExecuteInternalAsync(block, processedInputs, context, cancellationToken);

                // Process outputs
                if (result.Success && result.Outputs != null)
                {
                    await ProcessOutputsAsync(block, result.Outputs, context);
                }

                // Execution flow is determined by port connections, not NextBlockId
                result.NextBlockId = null;

                _console.Success($"Completed {BlockType} block: {block.Name}");
            }
            catch (OperationCanceledException)
            {
                result.Success = false;
                result.Error = "Operation cancelled";
                _console.Warning($"Cancelled {BlockType} block: {block.Name}");
                throw;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Error = ex.Message;
                _console.Error($"Failed {BlockType} block: {block.Name} - {ex.Message}");
                _logger.LogError(ex, "Error executing block {BlockId}", block.Id);
            }
            finally
            {
                stopwatch.Stop();
                result.Duration = stopwatch.Elapsed;
                result.Metadata = new Dictionary<string, object>
                {
                    ["blockId"] = block.Id,
                    ["blockType"] = BlockType.ToString(),
                    ["duration_ms"] = stopwatch.ElapsedMilliseconds
                };
            }

            return result;
        }

        public abstract Task<ValidationResult> ValidateAsync(
            WorkflowBlock block,
            Interfaces.ExecutionContext context);

        protected abstract Task<BlockExecutionResult> ExecuteInternalAsync(
            WorkflowBlock block,
            Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context,
            CancellationToken cancellationToken);

        protected virtual async Task ProcessOutputsAsync(
            WorkflowBlock block,
            Dictionary<string, object> outputs,
            Interfaces.ExecutionContext context)
        {
            // Outputs are already stored by port in WorkflowExecutor.StoreBlockOutputs
            // This method is kept for any additional processing if needed
        }

        protected T CastBlock<T>(WorkflowBlock block) where T : WorkflowBlock
        {
            if (block is T typedBlock)
                return typedBlock;
                
            throw new InvalidOperationException(
                $"Block {block.Id} is not of type {typeof(T).Name}");
        }
    }
}
