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

                // Process inputs
                var processedInputs = await ProcessInputsAsync(block, context);
                
                // Update variables from inputs
                if (processedInputs != null)
                {
                    foreach (var input in processedInputs)
                    {
                        context.Variables[$"inputs.{input.Key}"] = input.Value;
                    }
                }

                // Execute the specific block logic
                result = await ExecuteInternalAsync(block, processedInputs, context, cancellationToken);

                // Process outputs
                if (result.Success && result.Outputs != null)
                {
                    await ProcessOutputsAsync(block, result.Outputs, context);
                }

                // Determine next block (only if not already set by the executor)
                if (string.IsNullOrEmpty(result.NextBlockId))
                {
                    result.NextBlockId = DetermineNextBlock(block, result.Success, context);
                }

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

        protected virtual async Task<Dictionary<string, object>?> ProcessInputsAsync(
            WorkflowBlock block,
            Interfaces.ExecutionContext context)
        {
            if (block.Inputs == null || block.Inputs.Count == 0)
                return null;

            var processedInputs = new Dictionary<string, object>();

            foreach (var input in block.Inputs)
            {
                // Replace variables in input value
                var processedValue = _variableStore.ReplaceVariablesInObject(input.Value);
                
                // Evaluate if it's a variable reference
                if (input.Value.StartsWith("{{") && input.Value.EndsWith("}}"))
                {
                    var varName = input.Value.Trim('{', '}', ' ');
                    processedValue = _variableStore.GetVariable(varName) ?? processedValue;
                }

                processedInputs[input.Key] = processedValue ?? input.Value;
            }

            return processedInputs;
        }

        protected virtual async Task ProcessOutputsAsync(
            WorkflowBlock block,
            Dictionary<string, object> outputs,
            Interfaces.ExecutionContext context)
        {
            if (block.Outputs == null || block.Outputs.Count == 0)
                return;

            foreach (var output in block.Outputs)
            {
                var value = outputs.ContainsKey(output.Value) ? outputs[output.Value] : null;
                
                if (value != null)
                {
                    _variableStore.SetVariable(output.Key, value);
                    context.Variables[output.Key] = value;
                    _logger.LogDebug("Set variable {Variable} from block {BlockId}", output.Key, block.Id);
                }
            }
        }

        protected virtual string? DetermineNextBlock(WorkflowBlock block, bool success, Interfaces.ExecutionContext context)
        {
            if (success && !string.IsNullOrEmpty(block.OnSuccess))
                return block.OnSuccess;
            
            if (!success && !string.IsNullOrEmpty(block.OnFailure))
                return block.OnFailure;
                
            // OnComplete runs regardless of success/failure
            if (!string.IsNullOrEmpty(block.OnComplete))
                return block.OnComplete;
                
            return null;
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
