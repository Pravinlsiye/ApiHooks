using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
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

                // Set initial workflow inputs
            if (inputs != null)
            {
                context.WorkflowInputs = new Dictionary<string, object>(inputs);
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
                    var errorMessages = validation.Errors.Select(e => e.Message);
                    var blockErrors = validation.BlockErrors.SelectMany(kvp => 
                        kvp.Value.Select(err => $"Block '{kvp.Key}': {err}"));
                    
                    var allErrors = string.Join(", ", errorMessages.Concat(blockErrors));
                    
                    throw new InvalidOperationException(
                        $"Workflow validation failed: {allErrors}");
                }

                // Find start block
                var startBlock = workflow.Blocks.FirstOrDefault(b => b.Type == BlockType.Start);
                if (startBlock == null)
                {
                    throw new InvalidOperationException("Workflow must have a Start block");
                }

                // Execute workflow using port-based connections
                var blocksToExecute = new Queue<string>();
                blocksToExecute.Enqueue(startBlock.Id);
                var executedBlocks = new HashSet<string>();
                
                while (blocksToExecute.Count > 0)
                {
                    if (cancellationToken.IsCancellationRequested)
                    {
                        throw new OperationCanceledException();
                    }

                    var currentBlockId = blocksToExecute.Dequeue();
                    
                    // Skip if already executed
                    if (executedBlocks.Contains(currentBlockId))
                    {
                        continue;
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

                    // Prepare inputs from port connections
                    var blockInputs = PrepareBlockInputs(block, workflow, context);
                    
                    // Store in context for block executor to use
                    context.BlockInputs = blockInputs;

                    // Execute block
                    _logger.LogDebug("Executing block {BlockId} ({BlockType})", block.Id, block.Type);
                    var blockResult = await executor.ExecuteAsync(block, context, cancellationToken);

                    // Store outputs by port
                    if (blockResult.Outputs != null)
                    {
                        StoreBlockOutputs(block, blockResult.Outputs, context);
                        
                        // If this is an End block, capture outputs
                        if (block.Type == BlockType.End)
                        {
                            result.Outputs = blockResult.Outputs;
                            result.Success = blockResult.Success;
                            break;
                        }
                    }

                    // Record execution
                    var record = new BlockExecutionRecord
                    {
                        BlockId = block.Id,
                        BlockName = block.Name,
                        BlockType = block.Type.ToString(),
                        Success = blockResult.Success,
                        StartedAt = DateTime.UtcNow.Subtract(blockResult.Duration),
                        CompletedAt = DateTime.UtcNow,
                        Inputs = blockInputs,
                        Outputs = blockResult.Outputs,
                        Error = blockResult.Error
                    };
                    result.ExecutionPath.Add(record);

                    // Check if block has failure outputs (e.g., from Evaluate or HttpRequest blocks)
                    // Even if Success=true, check for failure port outputs
                    if (blockResult.Outputs != null && (blockResult.Outputs.ContainsKey("failure") || blockResult.Outputs.ContainsKey("fail")))
                    {
                        // Block produced failure output - check if there's a failure handler
                        var hasFailureConnection = block.Connections?.Any(c => 
                            c.FromPort == "failure" || c.FromPort == "fail" || c.FromPort == "error") ?? false;
                        
                        if (!hasFailureConnection)
                        {
                            // No failure handler - stop workflow
                            result.Success = false;
                            result.Error = blockResult.Error ?? blockResult.Outputs.GetValueOrDefault("errorMessage")?.ToString() ?? blockResult.Outputs.GetValueOrDefault("error")?.ToString() ?? "Block execution failed";
                            break;
                        }
                        else
                        {
                            _console.Info($"Block {block.Id} has failure output but failure port connection exists - routing to error handler");
                        }
                    }
                    // Check if block failed without failure port outputs (legacy failure)
                    else if (!blockResult.Success)
                    {
                        // Traditional failure - stop workflow
                        result.Success = false;
                        result.Error = blockResult.Error ?? "Workflow failed";
                        break;
                    }

                    // Queue next blocks from port connections
                    var nextBlocks = GetConnectedBlocks(block, workflow, context);
                    foreach (var nextBlockId in nextBlocks)
                    {
                        if (!executedBlocks.Contains(nextBlockId))
                        {
                            blocksToExecute.Enqueue(nextBlockId);
                        }
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
            result.Variables = _variableStore.GetAllVariables();
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
                new JsonSerializerSettings 
                { 
                    Converters = { new WorkflowBlockConverter() },
                    MissingMemberHandling = MissingMemberHandling.Ignore
                });
            
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

        /// <summary>
        /// Prepares inputs for a block based on port connections
        /// </summary>
        private Dictionary<string, object> PrepareBlockInputs(
            WorkflowBlock block,
            WorkflowDefinition workflow,
            Interfaces.ExecutionContext context)
        {
            var inputs = new Dictionary<string, object>();
            
            // Find all connections TO this block
            var incomingConnections = workflow.Blocks
                .SelectMany(b => b.Connections ?? new List<PortConnection>())
                .Where(c => c.ToBlock == block.Id)
                .ToList();
            
            foreach (var connection in incomingConnections)
            {
                // Get value from source block's output port
                if (context.BlockOutputs.TryGetValue(connection.FromBlock, out var sourceOutputs))
                {
                    if (sourceOutputs.TryGetValue(connection.FromPort, out var value))
                    {
                        // Map to target block's input port
                        inputs[connection.ToPort] = value;
                    }
                }
            }
            
            return inputs;
        }

        /// <summary>
        /// Stores block outputs by port name
        /// </summary>
        private void StoreBlockOutputs(
            WorkflowBlock block,
            Dictionary<string, object> outputs,
            Interfaces.ExecutionContext context)
        {
            if (!context.BlockOutputs.ContainsKey(block.Id))
            {
                context.BlockOutputs[block.Id] = new Dictionary<string, object>();
            }
            
            foreach (var output in outputs)
            {
                context.BlockOutputs[block.Id][output.Key] = output.Value;
            }
        }

        /// <summary>
        /// Gets blocks connected to this block via port connections
        /// Only returns blocks connected to ports that have outputs
        /// </summary>
        private List<string> GetConnectedBlocks(
            WorkflowBlock block,
            WorkflowDefinition workflow,
            Interfaces.ExecutionContext context)
        {
            var nextBlocks = new List<string>();
            
            // Get blocks this block connects to via ports
            if (block.Connections != null)
            {
                // Get outputs for this block
                var blockOutputs = context.BlockOutputs.TryGetValue(block.Id, out var outputs) 
                    ? outputs 
                    : new Dictionary<string, object>();
                
                // Only follow connections from ports that have outputs
                foreach (var connection in block.Connections)
                {
                    if (blockOutputs.ContainsKey(connection.FromPort))
                    {
                        nextBlocks.Add(connection.ToBlock);
                    }
                }
            }
            
            return nextBlocks.Distinct().ToList();
        }

        private void ValidateBlockConnections(WorkflowBlock block, List<WorkflowBlock> allBlocks, WorkflowValidationResult result)
        {
            var validBlockIds = allBlocks.Select(b => b.Id).ToHashSet();

            // Validate port-based connections
            if (block.Connections != null)
            {
                foreach (var connection in block.Connections)
                {
                    // Validate from block exists
                    if (!validBlockIds.Contains(connection.FromBlock))
            {
                result.IsValid = false;
                result.Errors.Add(new ValidationError
                {
                    Code = "INVALID_CONNECTION",
                            Message = $"Block {block.Id} has connection from invalid block: {connection.FromBlock}",
                    BlockId = block.Id
                });
            }

                    // Validate to block exists
                    if (!validBlockIds.Contains(connection.ToBlock))
            {
                result.IsValid = false;
                result.Errors.Add(new ValidationError
                {
                    Code = "INVALID_CONNECTION",
                            Message = $"Block {block.Id} has connection to invalid block: {connection.ToBlock}",
                    BlockId = block.Id
                });
            }

                    // Validate from port exists on source block
                    var fromBlock = allBlocks.FirstOrDefault(b => b.Id == connection.FromBlock);
                    if (fromBlock != null && fromBlock.OutputPorts != null)
                    {
                        if (!fromBlock.OutputPorts.Any(p => p.Name == connection.FromPort))
                {
                            result.Warnings.Add(new ValidationWarning
                    {
                                Code = "INVALID_PORT",
                                Message = $"Connection from {connection.FromBlock}.{connection.FromPort} references non-existent output port",
                        BlockId = block.Id
                    });
                }
                    }

                    // Validate to port exists on target block
                    var toBlock = allBlocks.FirstOrDefault(b => b.Id == connection.ToBlock);
                    if (toBlock != null && toBlock.InputPorts != null)
                {
                        if (!toBlock.InputPorts.Any(p => p.Name == connection.ToPort))
                        {
                            result.Warnings.Add(new ValidationWarning
                    {
                                Code = "INVALID_PORT",
                                Message = $"Connection to {connection.ToBlock}.{connection.ToPort} references non-existent input port",
                        BlockId = block.Id
                    });
                        }
                    }
                }
            }
        }
    }
}
