using SiyeFlow.Core.Models;
using System.Threading.Tasks;

namespace SiyeFlow.Core.Interfaces
{
    /// <summary>
    /// Service for workflow management
    /// </summary>
    public interface IWorkflowService
    {
        /// <summary>
        /// Load a workflow from JSON string
        /// </summary>
        Task<WorkflowDefinition> LoadWorkflowAsync(string json);
        
        /// <summary>
        /// Load a workflow from file path
        /// </summary>
        Task<WorkflowDefinition> LoadWorkflowFromFileAsync(string filePath);
        
        /// <summary>
        /// Validate a workflow definition
        /// </summary>
        Task<ValidationResult> ValidateWorkflowAsync(WorkflowDefinition workflow);
        
        /// <summary>
        /// Serialize a workflow to JSON
        /// </summary>
        Task<string> SerializeWorkflowAsync(WorkflowDefinition workflow);
    }
}
