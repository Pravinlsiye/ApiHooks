using Microsoft.OpenApi.Models;
using SiyeFlow.CLI.Models;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Interfaces
{
    /// <summary>
    /// Interface for executing workflows
    /// </summary>
    public interface IWorkflowExecutor
    {
        /// <summary>
        /// Executes a complete workflow
        /// </summary>
        Task<WorkflowExecutionResult> ExecuteAsync(
            WorkflowDefinition workflow,
            OpenApiDocument? apiDocument = null,
            Dictionary<string, object>? inputs = null,
            bool dryRun = false,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Validates a workflow before execution
        /// </summary>
        Task<WorkflowValidationResult> ValidateAsync(
            WorkflowDefinition workflow,
            OpenApiDocument? apiDocument = null);

        /// <summary>
        /// Executes a workflow from a file path or URL
        /// </summary>
        Task<WorkflowExecutionResult> ExecuteFromPathAsync(
            string workflowPath,
            string? apiPath = null,
            Dictionary<string, object>? inputs = null,
            bool dryRun = false,
            CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Result of workflow execution
    /// </summary>
    public class WorkflowExecutionResult
    {
        public string WorkflowName { get; set; } = string.Empty;
        public string ExecutionId { get; set; } = Guid.NewGuid().ToString();
        public bool Success { get; set; }
        public Dictionary<string, object> Outputs { get; set; } = new();
        public List<BlockExecutionRecord> ExecutionPath { get; set; } = new();
        public DateTime StartedAt { get; set; }
        public DateTime CompletedAt { get; set; }
        public TimeSpan Duration => CompletedAt - StartedAt;
        public string? Error { get; set; }
        public Dictionary<string, object> FinalVariables { get; set; } = new();
    }

    /// <summary>
    /// Record of a single block execution
    /// </summary>
    public class BlockExecutionRecord
    {
        public string BlockId { get; set; } = string.Empty;
        public string BlockName { get; set; } = string.Empty;
        public BlockType BlockType { get; set; }
        public bool Success { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime CompletedAt { get; set; }
        public TimeSpan Duration => CompletedAt - StartedAt;
        public Dictionary<string, object>? Inputs { get; set; }
        public Dictionary<string, object>? Outputs { get; set; }
        public string? Error { get; set; }
        public int? RetryCount { get; set; }
    }

    /// <summary>
    /// Result of workflow validation
    /// </summary>
    public class WorkflowValidationResult
    {
        public bool IsValid { get; set; }
        public List<ValidationError> Errors { get; set; } = new();
        public List<ValidationWarning> Warnings { get; set; } = new();
        public Dictionary<string, List<string>> BlockErrors { get; set; } = new();
    }

    public class ValidationError
    {
        public string Code { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? BlockId { get; set; }
        public string? Path { get; set; }
    }

    public class ValidationWarning
    {
        public string Code { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? BlockId { get; set; }
    }
}
