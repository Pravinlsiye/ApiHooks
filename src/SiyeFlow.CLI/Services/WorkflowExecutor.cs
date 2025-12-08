using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
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
    /// Main workflow execution engine (Graph Based)
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

            if (inputs != null)
            {
                context.WorkflowInputs = new Dictionary<string, object>(inputs);
            }

            try
            {
                _console.Info($"Starting workflow: {workflow.Name}");

                // 1. Index the Graph
                var nodeMap = workflow.Nodes.ToDictionary(n => n.Id, n => n);
                var outgoingEdges = workflow.Edges
                    .Where(e => e.Type == EdgeType.Execution)
                    .GroupBy(e => e.Source)
                    .ToDictionary(g => g.Key, g => g.ToList());
                
                var incomingDataEdges = workflow.Edges
                    .Where(e => e.Type == EdgeType.Data)
                    .GroupBy(e => e.Target)
                    .ToDictionary(g => g.Key, g => g.ToList());

                // 2. Find Start Node
                var startNode = workflow.Nodes.FirstOrDefault(n => n.Type == BlockType.Start);
                if (startNode == null) throw new InvalidOperationException("Workflow must have a Start node");

                // 3. BFS / Traversal Queue
                var nodesToExecute = new Queue<string>();
                nodesToExecute.Enqueue(startNode.Id);
                
                while (nodesToExecute.Count > 0)
                {
                    if (cancellationToken.IsCancellationRequested) throw new OperationCanceledException();

                    var currentNodeId = nodesToExecute.Dequeue();
                    if (!nodeMap.TryGetValue(currentNodeId, out var currentNode)) continue;

                    // 4. Data Injection (Hydrate Node)
                    // We create a COPY of the node's data so we don't mutate the definition
                    var runtimeData = (JObject)currentNode.Data.DeepClone();
                    
                    if (incomingDataEdges.TryGetValue(currentNodeId, out var dataEdges))
                    {
                        foreach (var edge in dataEdges)
                        {
                            // Get value from source node output
                            if (context.BlockOutputs.TryGetValue(edge.Source, out var sourceOutputs))
                            {
                                // Handle array indexing in source handle (e.g. "body[0].id")
                                // For now, assuming simple keys or direct matching
                                // TODO: Implement robust path resolution
                                
                                if (sourceOutputs.TryGetValue(edge.SourceHandle, out var val))
                                {
                                    InjectValue(runtimeData, edge.TargetHandle, val);
                                }
                                else
                                {
                                    // Try to resolve complex path from sourceOutputs
                                    // This is a simplified check
                                }
                            }
                        }
                    }
                    
                    // Temporarily assign runtime data to node for execution
                    var originalData = currentNode.Data;
                    currentNode.Data = runtimeData;

                    // 5. Execute Node
                    _logger.LogDebug("Executing Node {Id} ({Type})", currentNode.Id, currentNode.Type);
                    var executor = _blockRegistry.GetExecutor(currentNode);
                    if (executor == null) throw new InvalidOperationException($"No executor for type {currentNode.Type}");

                    BlockExecutionResult blockResult;
                    try
                    {
                        blockResult = await executor.ExecuteAsync(currentNode, context, cancellationToken);
                    }
                    finally
                    {
                        // Restore static config
                        currentNode.Data = originalData;
                    }

                    // 6. Store Outputs
                    if (blockResult.Outputs != null)
                    {
                        context.BlockOutputs[currentNode.Id] = blockResult.Outputs;
                        
                        // FIX: Push outputs to global variable store so {{...}} resolution works
                        foreach (var kvp in blockResult.Outputs)
                        {
                            // We prefix with node ID to avoid collisions? 
                            // Actually, the VariableStore seems to be a flat map in legacy code.
                            // For backward compatibility with blocks that use _variableStore.ReplaceVariables(),
                            // we must put them in the root.
                            // NOTE: This means last-write-wins for variables with same name!
                            _variableStore.SetVariable(kvp.Key, kvp.Value);
                        }
                    }

                    // 7. Record History
                    result.ExecutionPath.Add(new BlockExecutionRecord
                    {
                        BlockId = currentNode.Id,
                        BlockName = currentNode.Label ?? currentNode.Id,
                        BlockType = currentNode.Type.ToString(),
                        Success = blockResult.Success,
                        Outputs = blockResult.Outputs,
                        Duration = blockResult.Duration
                    });

                    // 8. Handle Flow Control (Next Steps)
                    if (!blockResult.Success)
                    {
                        result.Success = false;
                        result.Error = blockResult.Error;
                        break; 
                    }

                    if (currentNode.Type == BlockType.End)
                    {
                        result.Success = true;
                        result.Outputs = blockResult.Outputs;
                        break; // Workflow Complete
                    }

                    // Find next node
                    if (outgoingEdges.TryGetValue(currentNodeId, out var possibleNextEdges))
                    {
                        var nextEdge = possibleNextEdges.FirstOrDefault(e => 
                            e.SourceHandle == blockResult.NextHandle || 
                            (blockResult.NextHandle == "default" && string.IsNullOrEmpty(e.SourceHandle)));

                        if (nextEdge != null)
                        {
                            nodesToExecute.Enqueue(nextEdge.Target);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Execution failed");
                result.Success = false;
                result.Error = ex.Message;
            }
            finally
            {
                result.CompletedAt = DateTime.UtcNow;
                result.Duration = result.CompletedAt - result.StartedAt;
            }

            return result;
        }

        private void InjectValue(JObject data, string path, object value)
        {
            try 
            {
                var token = data.SelectToken(path);
                if (token != null && token.Parent != null)
                {
                    token.Replace(JToken.FromObject(value ?? ""));
                }
                else
                {
                    data[path] = JToken.FromObject(value ?? "");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to inject data into {path}: {ex.Message}");
            }
        }

        public Task<WorkflowValidationResult> ValidateAsync(WorkflowDefinition workflow, OpenApiDocument? apiDocument = null)
        {
            return Task.FromResult(new WorkflowValidationResult { IsValid = true });
        }

        public async Task<WorkflowExecutionResult> ExecuteFromPathAsync(
            string workflowPath,
            string? apiPath = null,
            Dictionary<string, object>? inputs = null,
            bool dryRun = false,
            CancellationToken cancellationToken = default)
        {
            var json = await File.ReadAllTextAsync(workflowPath, cancellationToken);
            var workflow = JsonConvert.DeserializeObject<WorkflowDefinition>(json);
            
            if (workflow == null) throw new InvalidOperationException("Failed to parse workflow");

            return await ExecuteAsync(workflow, null, inputs, dryRun, cancellationToken);
        }
    }
}
