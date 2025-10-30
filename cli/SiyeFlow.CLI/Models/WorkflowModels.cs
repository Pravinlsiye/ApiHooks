using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Collections.Generic;

namespace SiyeFlow.CLI.Models
{
    /// <summary>
    /// Block type enumeration
    /// </summary>
    [JsonConverter(typeof(StringEnumConverter))]
    public enum BlockType
    {
        Start,
        End,
        HttpRequest,
        Evaluate,
        Condition,
        Loop,
        Delay,
        Variable,
        Log,
        Collect,
        TryCatch,
        Workflow
    }

    /// <summary>
    /// Base class for all workflow blocks
    /// </summary>
    public abstract class WorkflowBlock
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("type")]
        public abstract BlockType Type { get; }

        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("description")]
        public string? Description { get; set; }

        [JsonProperty("inputs")]
        public Dictionary<string, string>? Inputs { get; set; }

        [JsonProperty("outputs")]
        public Dictionary<string, string>? Outputs { get; set; }

        [JsonProperty("onSuccess")]
        public string? OnSuccess { get; set; }

        [JsonProperty("onFailure")]
        public string? OnFailure { get; set; }

        [JsonProperty("onComplete")]
        public string? OnComplete { get; set; }
    }

    /// <summary>
    /// HTTP Request Block
    /// </summary>
    public class HttpRequestBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.HttpRequest;

        [JsonProperty("config")]
        public HttpRequestConfig Config { get; set; } = new();
    }

    public class HttpRequestConfig
    {
        [JsonProperty("method")]
        public string Method { get; set; } = "GET";

        [JsonProperty("url")]
        public string Url { get; set; } = string.Empty;

        [JsonProperty("headers")]
        public Dictionary<string, string>? Headers { get; set; }

        [JsonProperty("body")]
        public object? Body { get; set; }

        [JsonProperty("timeout")]
        public int? Timeout { get; set; }

        [JsonProperty("retries")]
        public int? Retries { get; set; }
    }

    /// <summary>
    /// Evaluate (Code Execution) Block
    /// </summary>
    public class EvaluateBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Evaluate;

        [JsonProperty("config")]
        public EvaluateConfig Config { get; set; } = new();
    }

    public class EvaluateConfig
    {
        [JsonProperty("language")]
        public string Language { get; set; } = "jsonpath";

        [JsonProperty("expressions")]
        public Dictionary<string, string>? Expressions { get; set; }

        [JsonProperty("code")]
        public string? Code { get; set; }
    }

    /// <summary>
    /// Condition (If/Else) Block
    /// </summary>
    public class ConditionBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Condition;

        [JsonProperty("config")]
        public ConditionConfig Config { get; set; } = new();

        [JsonProperty("branches")]
        public ConditionBranches Branches { get; set; } = new();
    }

    public class ConditionConfig
    {
        [JsonProperty("expression")]
        public string Expression { get; set; } = string.Empty;
    }

    public class ConditionBranches
    {
        [JsonProperty("true")]
        public string? TrueBranch { get; set; }

        [JsonProperty("false")]
        public string? FalseBranch { get; set; }
    }

    /// <summary>
    /// Loop (ForEach) Block
    /// </summary>
    public class LoopBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Loop;

        [JsonProperty("config")]
        public LoopConfig Config { get; set; } = new();

        [JsonProperty("loopBody")]
        public string? LoopBody { get; set; }
    }

    public class LoopConfig
    {
        [JsonProperty("items")]
        public string Items { get; set; } = string.Empty;

        [JsonProperty("itemName")]
        public string ItemName { get; set; } = "item";

        [JsonProperty("parallel")]
        public bool Parallel { get; set; }

        [JsonProperty("maxConcurrency")]
        public int? MaxConcurrency { get; set; }
    }

    /// <summary>
    /// Delay Block
    /// </summary>
    public class DelayBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Delay;

        [JsonProperty("config")]
        public DelayConfig Config { get; set; } = new();
    }

    public class DelayConfig
    {
        [JsonProperty("duration")]
        public int? Duration { get; set; }

        [JsonProperty("dynamic")]
        public string? Dynamic { get; set; }
    }

    /// <summary>
    /// Variable Block
    /// </summary>
    public class VariableBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Variable;

        [JsonProperty("config")]
        public VariableConfig Config { get; set; } = new();
    }

    public class VariableConfig
    {
        [JsonProperty("operation")]
        public string Operation { get; set; } = "set";

        [JsonProperty("variables")]
        public Dictionary<string, object>? Variables { get; set; }
    }

    /// <summary>
    /// Log Block
    /// </summary>
    public class LogBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Log;

        [JsonProperty("config")]
        public LogConfig Config { get; set; } = new();
    }

    public class LogConfig
    {
        [JsonProperty("level")]
        public string Level { get; set; } = "info";

        [JsonProperty("message")]
        public string Message { get; set; } = string.Empty;

        [JsonProperty("data")]
        public Dictionary<string, object>? Data { get; set; }
    }

    /// <summary>
    /// Collect (Aggregate) Block
    /// </summary>
    public class CollectBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Collect;

        [JsonProperty("config")]
        public CollectConfig Config { get; set; } = new();
    }

    public class CollectConfig
    {
        [JsonProperty("strategy")]
        public string Strategy { get; set; } = "array";

        [JsonProperty("groupBy")]
        public string? GroupBy { get; set; }

        [JsonProperty("filter")]
        public string? Filter { get; set; }
    }

    /// <summary>
    /// Start Block
    /// </summary>
    public class StartBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Start;

        [JsonProperty("config")]
        public StartConfig Config { get; set; } = new();
    }

    public class StartConfig
    {
        [JsonProperty("inputs")]
        public Dictionary<string, InputDefinition>? Inputs { get; set; }
    }

    public class InputDefinition
    {
        [JsonProperty("type")]
        public string Type { get; set; } = "string";

        [JsonProperty("required")]
        public bool Required { get; set; }

        [JsonProperty("description")]
        public string? Description { get; set; }

        [JsonProperty("default")]
        public object? Default { get; set; }
    }

    /// <summary>
    /// End Block
    /// </summary>
    public class EndBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.End;

        [JsonProperty("config")]
        public EndConfig Config { get; set; } = new();
    }

    public class EndConfig
    {
        [JsonProperty("outputs")]
        public Dictionary<string, OutputDefinition>? Outputs { get; set; }
    }

    public class OutputDefinition
    {
        [JsonProperty("type")]
        public string Type { get; set; } = "string";

        [JsonProperty("value")]
        public string Value { get; set; } = string.Empty;

        [JsonProperty("description")]
        public string? Description { get; set; }
    }

    /// <summary>
    /// Try/Catch/Finally Block
    /// </summary>
    public class TryCatchBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.TryCatch;

        [JsonProperty("config")]
        public TryCatchConfig Config { get; set; } = new();

        [JsonProperty("try")]
        public string? TryBlock { get; set; }

        [JsonProperty("catch")]
        public string? CatchBlock { get; set; }

        [JsonProperty("finally")]
        public string? FinallyBlock { get; set; }
    }

    public class TryCatchConfig
    {
        [JsonProperty("maxAttempts")]
        public int MaxAttempts { get; set; } = 1;

        [JsonProperty("retryDelay")]
        public int? RetryDelay { get; set; }
    }

    /// <summary>
    /// Sub-Workflow Block (Reusable workflow)
    /// </summary>
    public class SubWorkflowBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Workflow;

        [JsonProperty("config")]
        public SubWorkflowConfig Config { get; set; } = new();
    }

    public class SubWorkflowConfig
    {
        [JsonProperty("workflowId")]
        public string WorkflowId { get; set; } = string.Empty;

        [JsonProperty("async")]
        public bool Async { get; set; }
    }

    /// <summary>
    /// Workflow Definition
    /// </summary>
    public class WorkflowDefinition
    {
        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("description")]
        public string? Description { get; set; }

        [JsonProperty("inputs")]
        public Dictionary<string, string>? Inputs { get; set; }

        [JsonProperty("blocks")]
        public List<WorkflowBlock> Blocks { get; set; } = new();
    }

    /// <summary>
    /// Custom JSON converter for polymorphic block deserialization
    /// </summary>
    public class WorkflowBlockConverter : JsonConverter<WorkflowBlock>
    {
        public override WorkflowBlock ReadJson(JsonReader reader, Type objectType, WorkflowBlock? existingValue, bool hasExistingValue, JsonSerializer serializer)
        {
            var jsonObject = Newtonsoft.Json.Linq.JObject.Load(reader);
            var blockType = jsonObject["type"]?.ToString();

            WorkflowBlock block = blockType?.ToLowerInvariant() switch
            {
                "start" => new StartBlock(),
                "end" => new EndBlock(),
                "http-request" => new HttpRequestBlock(),
                "evaluate" => new EvaluateBlock(),
                "condition" => new ConditionBlock(),
                "loop" => new LoopBlock(),
                "delay" => new DelayBlock(),
                "variable" => new VariableBlock(),
                "log" => new LogBlock(),
                "collect" => new CollectBlock(),
                "try-catch" => new TryCatchBlock(),
                "workflow" => new SubWorkflowBlock(),
                _ => throw new InvalidOperationException($"Unknown block type: {blockType}")
            };

            serializer.Populate(jsonObject.CreateReader(), block);
            return block;
        }

        public override void WriteJson(JsonWriter writer, WorkflowBlock? value, JsonSerializer serializer)
        {
            serializer.Serialize(writer, value);
        }
    }
}
