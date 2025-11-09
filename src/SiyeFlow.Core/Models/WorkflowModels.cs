using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Collections.Generic;
using System.Linq;

namespace SiyeFlow.Core.Models
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
    [JsonConverter(typeof(WorkflowBlockConverter))]
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

        // Port-based connections
        [JsonProperty("inputPorts")]
        public List<PortDefinition>? InputPorts { get; set; }

        [JsonProperty("outputPorts")]
        public List<PortDefinition>? OutputPorts { get; set; }

        [JsonProperty("connections")]
        public List<PortConnection>? Connections { get; set; }
    }

    /// <summary>
    /// Port definition for block inputs/outputs
    /// </summary>
    public class PortDefinition
    {
        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("type")]
        public string Type { get; set; } = "any";

        [JsonProperty("description")]
        public string? Description { get; set; }

        [JsonProperty("required")]
        public bool Required { get; set; }

        [JsonProperty("multiple")]
        public bool Multiple { get; set; } // Allow multiple connections to this port
    }

    /// <summary>
    /// Connection between block ports
    /// </summary>
    public class PortConnection
    {
        [JsonProperty("fromBlock")]
        public string FromBlock { get; set; } = string.Empty;

        [JsonProperty("fromPort")]
        public string FromPort { get; set; } = string.Empty;

        [JsonProperty("toBlock")]
        public string ToBlock { get; set; } = string.Empty;

        [JsonProperty("toPort")]
        public string ToPort { get; set; } = string.Empty;
    }

    /// <summary>
    /// Workflow definition
    /// </summary>
    public class WorkflowDefinition
    {
        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("description")]
        public string? Description { get; set; }

        [JsonProperty("version")]
        public string? Version { get; set; }

        [JsonProperty("metadata")]
        public Dictionary<string, object>? Metadata { get; set; }

        [JsonProperty("inputs")]
        public Dictionary<string, InputDefinition>? Inputs { get; set; }

        [JsonProperty("outputs")]
        public Dictionary<string, OutputDefinition>? Outputs { get; set; }

        [JsonProperty("blocks")]
        public List<WorkflowBlock> Blocks { get; set; } = new();
    }

    /// <summary>
    /// Custom JSON converter for WorkflowBlock polymorphic deserialization
    /// </summary>
    public class WorkflowBlockConverter : JsonConverter<WorkflowBlock>
    {
        public override bool CanWrite => false;

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
            throw new NotImplementedException();
        }
    }

    /// <summary>
    /// Start Block
    /// </summary>
    public class StartBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Start;

        [JsonProperty("config")]
        public StartConfig Config { get; set; } = new();

        public StartBlock()
        {
            // Start blocks typically don't have input ports
            InputPorts = new List<PortDefinition>();
            // Output ports will be dynamically generated based on inputs
            OutputPorts = new List<PortDefinition>();
        }

        /// <summary>
        /// Updates output ports based on configured inputs
        /// </summary>
        public void UpdateOutputPorts()
        {
            OutputPorts = new List<PortDefinition>();

            // Get effective inputs from profiles or direct inputs
            var effectiveInputs = GetEffectiveInputs();

            foreach (var input in effectiveInputs)
            {
                OutputPorts.Add(new PortDefinition
                {
                    Name = input.Key,
                    Type = input.Value.Type,
                    Description = input.Value.Description,
                    Multiple = true // Start block outputs can connect to multiple blocks
                });
            }
        }

        private Dictionary<string, InputDefinition> GetEffectiveInputs()
        {
            var result = new Dictionary<string, InputDefinition>();

            // If using profiles
            if (Config.Profiles != null && Config.Profiles.Any())
            {
                var selectedProfile = Config.Profiles.FirstOrDefault(p => p.Name == Config.SelectedProfile)
                    ?? Config.Profiles.FirstOrDefault(p => p.Default)
                    ?? Config.Profiles.First();

                return selectedProfile.Inputs;
            }

            // Otherwise use direct inputs
            return Config.Inputs ?? result;
        }
    }

    public class StartConfig
    {
        [JsonProperty("inputs")]
        public Dictionary<string, InputDefinition>? Inputs { get; set; }
        
        [JsonProperty("profiles")]
        public List<InputProfile>? Profiles { get; set; }
        
        [JsonProperty("selectedProfile")]
        public string? SelectedProfile { get; set; }
        
        [JsonProperty("overrides")]
        public Dictionary<string, object>? Overrides { get; set; }
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
        
        [JsonProperty("value")]
        public object? Value { get; set; }
    }
    
    public class InputProfile
    {
        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;
        
        [JsonProperty("description")]
        public string? Description { get; set; }
        
        [JsonProperty("default")]
        public bool Default { get; set; }
        
        [JsonProperty("inputs")]
        public Dictionary<string, InputDefinition> Inputs { get; set; } = new();
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
    }

    public class TryCatchConfig
    {
        [JsonProperty("tryBlock")]
        public string TryBlock { get; set; } = string.Empty;

        [JsonProperty("catchBlock")]
        public string? CatchBlock { get; set; }

        [JsonProperty("finallyBlock")]
        public string? FinallyBlock { get; set; }

        [JsonProperty("retries")]
        public int? Retries { get; set; }

        [JsonProperty("retryDelay")]
        public int? RetryDelay { get; set; }
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

        [JsonProperty("successCodes")]
        public List<int>? SuccessCodes { get; set; }
    }

    /// <summary>
    /// Evaluate Block
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

        [JsonProperty("expression")]
        public string Expression { get; set; } = string.Empty;

        [JsonProperty("data")]
        public string? Data { get; set; }
    }

    /// <summary>
    /// Condition Block
    /// </summary>
    public class ConditionBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Condition;

        [JsonProperty("config")]
        public ConditionConfig Config { get; set; } = new();
    }

    public class ConditionConfig
    {
        [JsonProperty("expression")]
        public string Expression { get; set; } = string.Empty;

        [JsonProperty("onTrue")]
        public string? OnTrue { get; set; }

        [JsonProperty("onFalse")]
        public string? OnFalse { get; set; }
    }

    /// <summary>
    /// Loop Block
    /// </summary>
    public class LoopBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Loop;

        [JsonProperty("config")]
        public LoopConfig Config { get; set; } = new();
    }

    public class LoopConfig
    {
        [JsonProperty("items")]
        public string Items { get; set; } = string.Empty;

        [JsonProperty("itemVariable")]
        public string ItemVariable { get; set; } = "item";

        [JsonProperty("indexVariable")]
        public string IndexVariable { get; set; } = "index";

        [JsonProperty("loopBlock")]
        public string LoopBlock { get; set; } = string.Empty;

        [JsonProperty("maxIterations")]
        public int? MaxIterations { get; set; }
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
        [JsonProperty("milliseconds")]
        public int Milliseconds { get; set; }
        
        [JsonProperty("message")]
        public string? Message { get; set; }
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
        public string Operation { get; set; } = "set"; // set, get, delete

        [JsonProperty("variables")]
        public Dictionary<string, object> Variables { get; set; } = new();
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
        [JsonProperty("message")]
        public string Message { get; set; } = string.Empty;

        [JsonProperty("level")]
        public string Level { get; set; } = "info";
    }

    /// <summary>
    /// Collect Block
    /// </summary>
    public class CollectBlock : WorkflowBlock
    {
        public override BlockType Type => BlockType.Collect;

        [JsonProperty("config")]
        public CollectConfig Config { get; set; } = new();
    }

    public class CollectConfig
    {
        [JsonProperty("fromLoop")]
        public string FromLoop { get; set; } = string.Empty;

        [JsonProperty("collectExpression")]
        public string CollectExpression { get; set; } = string.Empty;

        [JsonProperty("outputVariable")]
        public string OutputVariable { get; set; } = string.Empty;
    }

    /// <summary>
    /// Sub-Workflow Block
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

        [JsonProperty("inputs")]
        public Dictionary<string, object>? Inputs { get; set; }

        [JsonProperty("outputMapping")]
        public Dictionary<string, string>? OutputMapping { get; set; }
    }

    /// <summary>
    /// Workflow execution result
    /// </summary>
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
        public string? LastExecutedBlockId { get; set; }
    }

    /// <summary>
    /// Block execution record
    /// </summary>
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
        public Dictionary<string, object>? Inputs { get; set; }
        public Dictionary<string, object>? Outputs { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
    }

    /// <summary>
    /// Block execution result
    /// </summary>
    public class BlockExecutionResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public Dictionary<string, object> Outputs { get; set; } = new();
        public string? NextBlockId { get; set; }
        public TimeSpan Duration { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
    }

    /// <summary>
    /// Validation result
    /// </summary>
    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }
}
