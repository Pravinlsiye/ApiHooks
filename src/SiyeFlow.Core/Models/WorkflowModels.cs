using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Runtime.Serialization;

namespace SiyeFlow.Core.Models
{
    /// <summary>
    /// Block type enumeration
    /// </summary>
    [JsonConverter(typeof(StringEnumConverter))]
    public enum BlockType
    {
        // Core
        [EnumMember(Value = "start")]
        Start,
        [EnumMember(Value = "end")]
        End,
        [EnumMember(Value = "variable")]
        Variable,
        [EnumMember(Value = "evaluate")]
        Evaluate,
        [EnumMember(Value = "log")]
        Log,

        // Connectivity
        [EnumMember(Value = "http-request")]
        HttpRequest,
        [EnumMember(Value = "webhook-trigger")]
        WebhookTrigger,

        // Logic / Flow
        [EnumMember(Value = "switch")]
        Switch,
        [EnumMember(Value = "loop")]
        Loop,
        [EnumMember(Value = "delay")]
        Delay,
        [EnumMember(Value = "batch-process")]
        BatchProcess,
        [EnumMember(Value = "sub-workflow")]
        SubWorkflow,

        [EnumMember(Value = "condition")]
        Condition,

        // Files
        [EnumMember(Value = "file-download")]
        FileDownload,
        [EnumMember(Value = "file-upload")]
        FileUpload,
        [EnumMember(Value = "file-stream-writer")]
        FileStreamWriter,
        [EnumMember(Value = "file-stream-reader")]
        FileStreamReader
    }

    public enum EdgeType
    {
        [EnumMember(Value = "execution")]
        Execution,
        [EnumMember(Value = "data")]
        Data
    }

    /// <summary>
    /// Root Workflow Definition
    /// </summary>
    public class WorkflowDefinition
    {
        [JsonProperty("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("description")]
        public string? Description { get; set; }

        [JsonProperty("version")]
        public string Version { get; set; } = "2.0.0";

        [JsonProperty("meta")]
        public Dictionary<string, object>? Meta { get; set; }

        [JsonProperty("nodes")]
        public List<Node> Nodes { get; set; } = new();

        [JsonProperty("edges")]
        public List<Edge> Edges { get; set; } = new();
    }

    /// <summary>
    /// Represents a Block in the Graph (Location)
    /// </summary>
    public class Node
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("type")]
        public BlockType Type { get; set; }

        [JsonProperty("label")]
        public string? Label { get; set; }

        [JsonProperty("data")]
        public JObject Data { get; set; } = new JObject();

        [JsonProperty("interface")]
        public NodeInterface? Interface { get; set; }
    }

    public class NodeInterface
    {
        [JsonProperty("inputs")]
        public List<PortDefinition> Inputs { get; set; } = new();

        [JsonProperty("outputs")]
        public List<PortDefinition> Outputs { get; set; } = new();
    }

    public class PortDefinition
    {
        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("type")]
        public string Type { get; set; } = "any";

        [JsonProperty("required")]
        public bool Required { get; set; }

        [JsonProperty("label")]
        public string? Label { get; set; }
    }

    /// <summary>
    /// Represents a Connection in the Graph (Road)
    /// </summary>
    public class Edge
    {
        [JsonProperty("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [JsonProperty("type")]
        public EdgeType Type { get; set; } = EdgeType.Execution;

        [JsonProperty("source")]
        public string Source { get; set; } = string.Empty;

        [JsonProperty("sourceHandle")]
        public string SourceHandle { get; set; } = "default";

        [JsonProperty("target")]
        public string Target { get; set; } = string.Empty;

        [JsonProperty("targetHandle")]
        public string TargetHandle { get; set; } = "default";
    }

    public class WorkflowExecutionResult
    {
        public string ExecutionId { get; set; } = Guid.NewGuid().ToString();
        public bool Success { get; set; }
        public string? Error { get; set; }
        public string? WorkflowName { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime CompletedAt { get; set; }
        public TimeSpan Duration { get; set; }
        public List<BlockExecutionRecord> ExecutionPath { get; set; } = new();
        public Dictionary<string, object> Outputs { get; set; } = new();
        public Dictionary<string, object> Variables { get; set; } = new();
    }

    public class BlockExecutionRecord
    {
        public string BlockId { get; set; } = string.Empty;
        public string BlockType { get; set; } = string.Empty;
        public string BlockName { get; set; } = string.Empty;
        public DateTime StartedAt { get; set; }
        public DateTime CompletedAt { get; set; }
        public TimeSpan Duration { get; set; }
        public bool Success { get; set; }
        public string? Error { get; set; }
        public JObject? Inputs { get; set; }
        public Dictionary<string, object>? Outputs { get; set; }
    }

    public class BlockExecutionResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public Dictionary<string, object> Outputs { get; set; } = new();
        public string NextHandle { get; set; } = "default"; 
        public TimeSpan Duration { get; set; }
    }

    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }
}
