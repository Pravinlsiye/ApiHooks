using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.CLI.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services
{
    /// <summary>
    /// Main workflow execution engine
    /// </summary>
    public class WorkflowExecutor : IWorkflowExecutor
    {
        private readonly ILogger<WorkflowExecutor> _logger;
        private readonly IBlockRegistry _blockRegistry;
        private readonly IVariableStore _variableStore;
        private readonly IConsoleWriter _console;
        private readonly IApiDefinitionLoader _apiLoader;

        public WorkflowExecutor(
            ILogger<WorkflowExecutor> logger,
            IBlockRegistry blockRegistry,
            IVariableStore variableStore,
            IConsoleWriter console,
            IApiDefinitionLoader apiLoader)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _blockRegistry = blockRegistry ?? throw new ArgumentNullException(nameof(blockRegistry));
            _variableStore = variableStore ?? throw new ArgumentNullException(nameof(variableStore));
            _console = console ?? throw new ArgumentNullException(nameof(console));
            _apiLoader = apiLoader ?? throw new ArgumentNullException(nameof(apiLoader));
        }

        public async Task<WorkflowExecutionResult> ExecuteAsync(
            WorkflowDefinition workflow,
            OpenApiDocument? apiDocument = null,
            Dictionary<string, object>? inputs = null,
            bool dryRun = false,
            CancellationToken cancellationToken = default)
        {
            var result = new WorkflowExecutionResult
            {
                WorkflowName = workflow.Name,
                StartedAt = DateTime.UtcNow
            };

            var context = new Interfaces.ExecutionContext
            {
                WorkflowId = workflow.Name,
                ExecutionId = result.ExecutionId,
                ApiDocument = apiDocument,
                DryRun = dryRun,
                Variables = new Dictionary<string, object>()
            };

            // Set initial inputs in context
            if (inputs != null)
            {
                foreach (var input in inputs)
                {
                    context.Variables[$"inputs.{input.Key}"] = input.Value;
                }
            }

            try
            {
                _console.Info($"Starting workflow: {workflow.Name}");
                if (!string.IsNullOrEmpty(workflow.Description))
                {
                    _console.Info(workflow.Description);
                }

                // Validate workflow first
                var validation = await ValidateAsync(workflow, apiDocument);
                if (!validation.IsValid)
                {
                    throw new InvalidOperationException(
                        $"Workflow validation failed: {string.Join(", ", validation.Errors.Select(e => e.Message))}");
                }

                // Find start block
                var startBlock = workflow.Blocks.FirstOrDefault(b => b.Type == BlockType.Start);
                if (startBlock == null)
                {
                    throw new InvalidOperationException("Workflow must have a Start block");
                }

                // Execute workflow
                var currentBlockId = startBlock.Id;
                var executedBlocks = new HashSet<string>();
                
                while (!string.IsNullOrEmpty(currentBlockId))
                {
                    if (cancellationToken.IsCancellationRequested)
                    {
                        throw new OperationCanceledException();
                    }

                    // Prevent infinite loops
                    if (executedBlocks.Contains(currentBlockId))
                    {
                        _console.Warning($"Detected potential infinite loop at block {currentBlockId}");
                        break;
                    }
                    executedBlocks.Add(currentBlockId);

                    // Find block
                    var block = workflow.Blocks.FirstOrDefault(b => b.Id == currentBlockId);
                    if (block == null)
                    {
                        throw new InvalidOperationException($"Block not found: {currentBlockId}");
                    }

                    // Get executor
                    var executor = _blockRegistry.GetExecutor(block);
                    if (executor == null)
                    {
                        throw new InvalidOperationException($"No executor found for block type: {block.Type}");
                    }

                    // Update context
                    context.ExecutionPath.Add(block.Id);

                    // Execute block
                    _logger.LogDebug("Executing block {BlockId} ({BlockType})", block.Id, block.Type);
                    var blockResult = await executor.ExecuteAsync(block, context, cancellationToken);

                    // Record execution
                    var record = new BlockExecutionRecord
                    {
                        BlockId = block.Id,
                        BlockName = block.Name,
                        BlockType = block.Type,
                        Success = blockResult.Success,
                        StartedAt = DateTime.UtcNow.Subtract(blockResult.Duration),
                        CompletedAt = DateTime.UtcNow,
                        Inputs = block.Inputs?.ToDictionary(kvp => kvp.Key, kvp => (object)kvp.Value),
                        Outputs = blockResult.Outputs,
                        Error = blockResult.Error
                    };
                    result.ExecutionPath.Add(record);

                    // Process outputs
                    if (blockResult.Outputs != null)
                    {
                        foreach (var output in blockResult.Outputs)
                        {
                            context.Variables[$"{block.Id}.{output.Key}"] = output.Value;
                        }

                        // If this is an End block, capture outputs
                        if (block.Type == BlockType.End)
                        {
                            result.Outputs = blockResult.Outputs;
                        }
                    }

                    // Determine next block
                    currentBlockId = blockResult.NextBlockId;

                    // If execution failed and no failure path, stop
                    if (!blockResult.Success && string.IsNullOrEmpty(currentBlockId))
                    {
                        result.Success = false;
                        result.Error = blockResult.Error ?? "Workflow failed";
                        break;
                    }
                }

                // If we completed normally (reached end or no more blocks), mark success
                if (string.IsNullOrEmpty(result.Error))
                {
                    result.Success = true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Workflow execution failed");
                result.Success = false;
                result.Error = ex.Message;
                _console.Error($"Workflow failed: {ex.Message}");
            }
            finally
            {
                result.CompletedAt = DateTime.UtcNow;
                result.FinalVariables = _variableStore.GetAllVariables();
            }

            return result;
        }

        public async Task<WorkflowValidationResult> ValidateAsync(
            WorkflowDefinition workflow,
            OpenApiDocument? apiDocument = null)
        {
            var result = new WorkflowValidationResult { IsValid = true };

            try
            {
                // Validate workflow structure
                if (string.IsNullOrWhiteSpace(workflow.Name))
                {
                    result.IsValid = false;
                    result.Errors.Add(new ValidationError
                    {
                        Code = "WORKFLOW_NO_NAME",
                        Message = "Workflow must have a name"
                    });
                }

                if (workflow.Blocks == null || workflow.Blocks.Count == 0)
                {
                    result.IsValid = false;
                    result.Errors.Add(new ValidationError
                    {
                        Code = "WORKFLOW_NO_BLOCKS",
                        Message = "Workflow must have at least one block"
                    });
                    return result;
                }

                // Check for Start block
                var startBlocks = workflow.Blocks.Where(b => b.Type == BlockType.Start).ToList();
                if (startBlocks.Count == 0)
                {
                    result.IsValid = false;
                    result.Errors.Add(new ValidationError
                    {
                        Code = "WORKFLOW_NO_START",
                        Message = "Workflow must have a Start block"
                    });
                }
                else if (startBlocks.Count > 1)
                {
                    result.IsValid = false;
                    result.Errors.Add(new ValidationError
                    {
                        Code = "WORKFLOW_MULTIPLE_STARTS",
                        Message = "Workflow can only have one Start block"
                    });
                }

                // Check for duplicate block IDs
                var blockIds = new HashSet<string>();
                var duplicates = new List<string>();
                foreach (var block in workflow.Blocks)
                {
                    if (!blockIds.Add(block.Id))
                    {
                        duplicates.Add(block.Id);
                    }
                }

                if (duplicates.Any())
                {
                    result.IsValid = false;
                    result.Errors.Add(new ValidationError
                    {
                        Code = "WORKFLOW_DUPLICATE_IDS",
                        Message = $"Duplicate block IDs found: {string.Join(", ", duplicates)}"
                    });
                }

                // Validate each block
                var context = new Interfaces.ExecutionContext
                {
                    WorkflowId = workflow.Name,
                    ApiDocument = apiDocument
                };

                foreach (var block in workflow.Blocks)
                {
                    var executor = _blockRegistry.GetExecutor(block);
                    if (executor == null)
                    {
                        result.IsValid = false;
                        result.BlockErrors[block.Id] = new List<string>
                        {
                            $"No executor registered for block type: {block.Type}"
                        };
                        continue;
                    }

                    var blockValidation = await executor.ValidateAsync(block, context);
                    if (!blockValidation.IsValid)
                    {
                        result.IsValid = false;
                        result.BlockErrors[block.Id] = blockValidation.Errors;
                    }

                    if (blockValidation.Warnings.Any())
                    {
                        foreach (var warning in blockValidation.Warnings)
                        {
                            result.Warnings.Add(new ValidationWarning
                            {
                                Code = "BLOCK_WARNING",
                                Message = warning,
                                BlockId = block.Id
                            });
                        }
                    }

                    // Validate connections
                    ValidateBlockConnections(block, workflow.Blocks, result);
                }
            }
            catch (Exception ex)
            {
                result.IsValid = false;
                result.Errors.Add(new ValidationError
                {
                    Code = "VALIDATION_ERROR",
                    Message = $"Validation failed: {ex.Message}"
                });
            }

            return result;
        }

        public async Task<WorkflowExecutionResult> ExecuteFromPathAsync(
            string workflowPath,
            string? apiPath = null,
            Dictionary<string, object>? inputs = null,
            bool dryRun = false,
            CancellationToken cancellationToken = default)
        {
            // Load workflow
            var workflowJson = await File.ReadAllTextAsync(workflowPath, cancellationToken);
            var workflow = JsonConvert.DeserializeObject<WorkflowDefinition>(workflowJson, 
                new JsonSerializerSettings { Converters = { new WorkflowBlockConverter() } });
            
            if (workflow == null)
            {
                throw new InvalidOperationException("Failed to parse workflow file");
            }

            // Load API if provided
            OpenApiDocument? apiDocument = null;
            if (!string.IsNullOrEmpty(apiPath))
            {
                apiDocument = await _apiLoader.LoadAsync(apiPath);
            }

            // Execute
            return await ExecuteAsync(workflow, apiDocument, inputs, dryRun, cancellationToken);
        }

        private void ValidateBlockConnections(WorkflowBlock block, List<WorkflowBlock> allBlocks, WorkflowValidationResult result)
        {
            var validBlockIds = allBlocks.Select(b => b.Id).ToHashSet();

            // Check onSuccess
            if (!string.IsNullOrEmpty(block.OnSuccess) && !validBlockIds.Contains(block.OnSuccess))
            {
                result.IsValid = false;
                result.Errors.Add(new ValidationError
                {
                    Code = "INVALID_CONNECTION",
                    Message = $"Block {block.Id} has invalid onSuccess reference: {block.OnSuccess}",
                    BlockId = block.Id
                });
            }

            // Check onFailure
            if (!string.IsNullOrEmpty(block.OnFailure) && !validBlockIds.Contains(block.OnFailure))
            {
                result.IsValid = false;
                result.Errors.Add(new ValidationError
                {
                    Code = "INVALID_CONNECTION",
                    Message = $"Block {block.Id} has invalid onFailure reference: {block.OnFailure}",
                    BlockId = block.Id
                });
            }

            // Check onComplete
            if (!string.IsNullOrEmpty(block.OnComplete) && !validBlockIds.Contains(block.OnComplete))
            {
                result.IsValid = false;
                result.Errors.Add(new ValidationError
                {
                    Code = "INVALID_CONNECTION",
                    Message = $"Block {block.Id} has invalid onComplete reference: {block.OnComplete}",
                    BlockId = block.Id
                });
            }

            // Check type-specific connections
            if (block is ConditionBlock condBlock)
            {
                if (!string.IsNullOrEmpty(condBlock.Branches.TrueBranch) && 
                    !validBlockIds.Contains(condBlock.Branches.TrueBranch))
                {
                    result.IsValid = false;
                    result.Errors.Add(new ValidationError
                    {
                        Code = "INVALID_CONNECTION",
                        Message = $"Condition block {block.Id} has invalid true branch: {condBlock.Branches.TrueBranch}",
                        BlockId = block.Id
                    });
                }

                if (!string.IsNullOrEmpty(condBlock.Branches.FalseBranch) && 
                    !validBlockIds.Contains(condBlock.Branches.FalseBranch))
                {
                    result.IsValid = false;
                    result.Errors.Add(new ValidationError
                    {
                        Code = "INVALID_CONNECTION",
                        Message = $"Condition block {block.Id} has invalid false branch: {condBlock.Branches.FalseBranch}",
                        BlockId = block.Id
                    });
                }
            }
        }
    }
}
