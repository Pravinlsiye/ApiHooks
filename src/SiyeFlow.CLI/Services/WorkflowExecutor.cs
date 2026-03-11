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
    public class WorkflowExecutor : IWorkflowExecutor
    {
        private readonly ILogger<WorkflowExecutor> _logger;
        private readonly IBlockRegistry _blockRegistry;
        private readonly IVariableStore _variableStore;
        private readonly IConsoleWriter _console;
        private readonly IApiDefinitionLoader _apiLoader;

        private Dictionary<string, Node> _nodeMap = new();
        private Dictionary<string, List<Edge>> _outgoingEdges = new();
        private Dictionary<string, List<Edge>> _incomingDataEdges = new();

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

                _nodeMap = workflow.Nodes.ToDictionary(n => n.Id, n => n);
                _outgoingEdges = workflow.Edges
                    .Where(e => e.Type == EdgeType.Execution)
                    .GroupBy(e => e.Source)
                    .ToDictionary(g => g.Key, g => g.ToList());
                _incomingDataEdges = workflow.Edges
                    .Where(e => e.Type == EdgeType.Data)
                    .GroupBy(e => e.Target)
                    .ToDictionary(g => g.Key, g => g.ToList());

                var startNode = workflow.Nodes.FirstOrDefault(n => n.Type == BlockType.Start);
                if (startNode == null) throw new InvalidOperationException("Workflow must have a Start node");

                await ExecuteNodeAsync(startNode, context, result, cancellationToken);

                if (!result.ExecutionPath.Any(r => !r.Success))
                {
                    result.Success = true;
                }
            }
            catch (OperationCanceledException)
            {
                result.Success = false;
                result.Error = "Execution cancelled";
                _console.Warning("Workflow cancelled");
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
                _console.WorkflowSummary(result);
            }

            return result;
        }

        private async Task ExecuteNodeAsync(
            Node node,
            Interfaces.ExecutionContext context,
            WorkflowExecutionResult result,
            CancellationToken cancellationToken)
        {
            if (cancellationToken.IsCancellationRequested)
                throw new OperationCanceledException();

            // Data injection
            var runtimeData = (JObject)node.Data.DeepClone();
            if (_incomingDataEdges.TryGetValue(node.Id, out var dataEdges))
            {
                foreach (var edge in dataEdges)
                {
                    if (context.BlockOutputs.TryGetValue(edge.Source, out var sourceOutputs) &&
                        sourceOutputs.TryGetValue(edge.SourceHandle, out var val))
                    {
                        InjectValue(runtimeData, edge.TargetHandle, val);
                    }
                }
            }

            var originalData = node.Data;
            node.Data = runtimeData;

            var executor = _blockRegistry.GetExecutor(node);
            if (executor == null)
                throw new InvalidOperationException($"No executor for type {node.Type}");

            BlockExecutionResult blockResult;
            try
            {
                blockResult = await executor.ExecuteAsync(node, context, cancellationToken);
            }
            finally
            {
                node.Data = originalData;
            }

            // Store outputs
            if (blockResult.Outputs != null)
            {
                context.BlockOutputs[node.Id] = blockResult.Outputs;
                foreach (var kvp in blockResult.Outputs)
                {
                    _variableStore.SetVariable(kvp.Key, kvp.Value);
                }
            }

            result.ExecutionPath.Add(new BlockExecutionRecord
            {
                BlockId = node.Id,
                BlockName = node.Label ?? node.Id,
                BlockType = node.Type.ToString(),
                Success = blockResult.Success,
                Outputs = blockResult.Outputs,
                Duration = blockResult.Duration
            });

            if (!blockResult.Success)
            {
                result.Success = false;
                result.Error = blockResult.Error;

                var failEdges = GetOutgoingEdges(node.Id, "fail");
                if (failEdges.Count > 0)
                {
                    foreach (var edge in failEdges)
                    {
                        if (_nodeMap.TryGetValue(edge.Target, out var failNode))
                            await ExecuteNodeAsync(failNode, context, result, cancellationToken);
                    }
                }
                return;
            }

            if (node.Type == BlockType.End)
            {
                result.Success = true;
                result.Outputs = blockResult.Outputs;
                return;
            }

            // Loop: iterate body nodes via "each" edges, then follow "done"
            if (node.Type == BlockType.Loop || node.Type == BlockType.BatchProcess)
            {
                await ExecuteLoopBodyAsync(node, blockResult, context, result, cancellationToken);
                return;
            }

            // Follow next edges
            var nextHandle = blockResult.NextHandle ?? "default";
            var nextEdges = GetOutgoingEdges(node.Id, nextHandle);

            foreach (var edge in nextEdges)
            {
                if (_nodeMap.TryGetValue(edge.Target, out var nextNode))
                {
                    await ExecuteNodeAsync(nextNode, context, result, cancellationToken);
                }
            }
        }

        private async Task ExecuteLoopBodyAsync(
            Node loopNode,
            BlockExecutionResult loopResult,
            Interfaces.ExecutionContext context,
            WorkflowExecutionResult result,
            CancellationToken cancellationToken)
        {
            var eachEdges = GetOutgoingEdges(loopNode.Id, "each");
            var doneEdges = GetOutgoingEdges(loopNode.Id, "done");

            var items = new List<object>();
            if (loopResult.Outputs.TryGetValue("items", out var itemsObj))
            {
                if (itemsObj is IEnumerable<object> enumerable)
                    items = enumerable.ToList();
                else if (itemsObj is JArray jArray)
                    items = jArray.Select(t => (object)t).ToList();
            }

            _console.Info($"Loop: iterating {items.Count} items over {eachEdges.Count} body node(s)");

            for (int i = 0; i < items.Count; i++)
            {
                if (cancellationToken.IsCancellationRequested)
                    throw new OperationCanceledException();

                context.LoopIndex = i;
                context.LoopItem = items[i];
                context.LoopTotal = items.Count;
                _variableStore.SetVariable("loopIndex", i);
                _variableStore.SetVariable("loopItem", items[i]);
                _variableStore.SetVariable("loopCount", items.Count);

                _console.Info($"  Iteration {i + 1}/{items.Count}");

                foreach (var edge in eachEdges)
                {
                    if (_nodeMap.TryGetValue(edge.Target, out var bodyNode))
                    {
                        await ExecuteNodeAsync(bodyNode, context, result, cancellationToken);
                    }
                }
            }

            context.LoopIndex = null;
            context.LoopItem = null;
            context.LoopTotal = null;

            // Follow "done" edges
            foreach (var edge in doneEdges)
            {
                if (_nodeMap.TryGetValue(edge.Target, out var doneNode))
                {
                    await ExecuteNodeAsync(doneNode, context, result, cancellationToken);
                }
            }
        }

        private List<Edge> GetOutgoingEdges(string nodeId, string handle)
        {
            if (!_outgoingEdges.TryGetValue(nodeId, out var edges))
                return new List<Edge>();

            var matched = edges.Where(e => e.SourceHandle == handle).ToList();
            if (matched.Count == 0 && handle != "default")
                matched = edges.Where(e => e.SourceHandle == "default").ToList();

            return matched;
        }

        private void InjectValue(JObject data, string path, object value)
        {
            try
            {
                var token = data.SelectToken(path);
                if (token?.Parent != null)
                    token.Replace(JToken.FromObject(value ?? ""));
                else
                    data[path] = JToken.FromObject(value ?? "");
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to inject data into {Path}: {Message}", path, ex.Message);
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

            OpenApiDocument? apiDoc = null;
            if (!string.IsNullOrEmpty(apiPath))
            {
                apiDoc = await _apiLoader.LoadAsync(apiPath);
            }

            return await ExecuteAsync(workflow, apiDoc, inputs, dryRun, cancellationToken);
        }
    }
}
