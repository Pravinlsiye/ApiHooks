using Microsoft.OpenApi.Models;
using SiyeFlow.CLI.Models;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Interfaces
{
    /// <summary>
    /// Interface for executing individual workflow blocks
    /// </summary>
    public interface IBlockExecutor
    {
        /// <summary>
        /// Gets the block type this executor handles
        /// </summary>
        BlockType BlockType { get; }

        /// <summary>
        /// Executes a workflow block
        /// </summary>
        Task<BlockExecutionResult> ExecuteAsync(
            WorkflowBlock block, 
            ExecutionContext context,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Validates if a block can be executed
        /// </summary>
        Task<ValidationResult> ValidateAsync(
            WorkflowBlock block,
            ExecutionContext context);
    }

    /// <summary>
    /// Result of block execution
    /// </summary>
    public class BlockExecutionResult
    {
        public bool Success { get; set; }
        public Dictionary<string, object>? Outputs { get; set; }
        public string? Error { get; set; }
        public string? NextBlockId { get; set; }
        public TimeSpan Duration { get; set; }
        public Dictionary<string, object>? Metadata { get; set; }
    }

    /// <summary>
    /// Validation result for a block
    /// </summary>
    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    /// <summary>
    /// Execution context for blocks
    /// </summary>
    public class ExecutionContext
    {
        public string WorkflowId { get; set; } = string.Empty;
        public string ExecutionId { get; set; } = string.Empty;
        public OpenApiDocument? ApiDocument { get; set; }
        public Dictionary<string, object> Variables { get; set; } = new();
        public List<string> ExecutionPath { get; set; } = new();
        public bool DryRun { get; set; }
        
        // For loops
        public int? LoopIndex { get; set; }
        public object? LoopItem { get; set; }
        public int? LoopTotal { get; set; }
        
        // For error handling
        public Exception? CurrentError { get; set; }
        public int? RetryAttempt { get; set; }
    }
}
