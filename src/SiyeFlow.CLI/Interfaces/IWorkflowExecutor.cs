using Microsoft.OpenApi.Models;
using SiyeFlow.Core.Models;
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


}
