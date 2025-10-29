using Newtonsoft.Json;
using System.Collections.Generic;

namespace SiyeFlow.CLI.Models
{
    /// <summary>
    /// Represents the entire workflow definition
    /// </summary>
    public class FlowDefinition
    {
        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("description")]
        public string? Description { get; set; }

        [JsonProperty("variables")]
        public Dictionary<string, object>? Variables { get; set; }

        [JsonProperty("steps")]
        public List<FlowStep> Steps { get; set; } = new List<FlowStep>();
    }

    /// <summary>
    /// Represents a single step in the workflow
    /// </summary>
    public class FlowStep
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("description")]
        public string? Description { get; set; }

        [JsonProperty("operationId")]
        public string? OperationId { get; set; }

        [JsonProperty("path")]
        public string? Path { get; set; }

        [JsonProperty("method")]
        public string? Method { get; set; }

        [JsonProperty("parameters")]
        public Dictionary<string, object>? Parameters { get; set; }

        [JsonProperty("headers")]
        public Dictionary<string, string>? Headers { get; set; }

        [JsonProperty("body")]
        public object? Body { get; set; }

        [JsonProperty("condition")]
        public string? Condition { get; set; }

        [JsonProperty("onSuccess")]
        public StepAction? OnSuccess { get; set; }

        [JsonProperty("onFailure")]
        public StepAction? OnFailure { get; set; }

        [JsonProperty("retries")]
        public int? Retries { get; set; }

        [JsonProperty("timeout")]
        public int? Timeout { get; set; }

        [JsonProperty("extractVariables")]
        public Dictionary<string, string>? ExtractVariables { get; set; }
    }

    /// <summary>
    /// Represents actions to take on success or failure
    /// </summary>
    public class StepAction
    {
        [JsonProperty("goto")]
        public string? Goto { get; set; }

        [JsonProperty("stop")]
        public bool? Stop { get; set; }

        [JsonProperty("setVariables")]
        public Dictionary<string, object>? SetVariables { get; set; }
    }

    /// <summary>
    /// Represents the result of a step execution
    /// </summary>
    public class StepResult
    {
        public string StepId { get; set; } = string.Empty;
        public string StepName { get; set; } = string.Empty;
        public bool Success { get; set; }
        public int StatusCode { get; set; }
        public string? ResponseBody { get; set; }
        public Dictionary<string, string>? ResponseHeaders { get; set; }
        public string? Error { get; set; }
        public TimeSpan Duration { get; set; }
        public DateTime ExecutedAt { get; set; }
    }

    /// <summary>
    /// Represents the overall flow execution result
    /// </summary>
    public class FlowExecutionResult
    {
        public string FlowName { get; set; } = string.Empty;
        public bool Success { get; set; }
        public List<StepResult> StepResults { get; set; } = new List<StepResult>();
        public Dictionary<string, object> FinalVariables { get; set; } = new Dictionary<string, object>();
        public DateTime StartedAt { get; set; }
        public DateTime CompletedAt { get; set; }
        public TimeSpan TotalDuration => CompletedAt - StartedAt;
    }
}
