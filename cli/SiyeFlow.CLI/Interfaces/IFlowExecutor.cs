using Microsoft.OpenApi.Models;
using SiyeFlow.CLI.Models;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Interfaces
{
    /// <summary>
    /// Interface for executing API workflows
    /// </summary>
    public interface IFlowExecutor
    {
        /// <summary>
        /// Executes a complete workflow
        /// </summary>
        Task<FlowExecutionResult> ExecuteAsync(FlowDefinition flow, OpenApiDocument apiDocument, bool dryRun = false);

        /// <summary>
        /// Executes a single step in the workflow
        /// </summary>
        Task<StepResult> ExecuteStepAsync(FlowStep step, OpenApiDocument apiDocument, bool dryRun = false);
    }
}
