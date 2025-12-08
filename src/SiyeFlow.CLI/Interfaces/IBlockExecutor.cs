using Microsoft.OpenApi.Models;
using SiyeFlow.Core.Models;
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
        /// Executes a workflow block (Node)
        /// </summary>
        Task<BlockExecutionResult> ExecuteAsync(
            Node node, 
            ExecutionContext context,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Validates if a block can be executed
        /// </summary>
        Task<ValidationResult> ValidateAsync(
            Node node,
            ExecutionContext context);
    }
}
