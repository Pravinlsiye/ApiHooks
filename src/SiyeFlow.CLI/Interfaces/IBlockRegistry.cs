using SiyeFlow.Core.Models;

namespace SiyeFlow.CLI.Interfaces
{
    /// <summary>
    /// Registry for managing block executors
    /// </summary>
    public interface IBlockRegistry
    {
        /// <summary>
        /// Registers a block executor
        /// </summary>
        void Register<TExecutor>(BlockType blockType) where TExecutor : IBlockExecutor;

        /// <summary>
        /// Registers a block executor instance
        /// </summary>
        void Register(BlockType blockType, IBlockExecutor executor);

        /// <summary>
        /// Gets an executor for a block type
        /// </summary>
        IBlockExecutor? GetExecutor(BlockType blockType);

        /// <summary>
        /// Gets an executor for a workflow block
        /// </summary>
        IBlockExecutor? GetExecutor(WorkflowBlock block);

        /// <summary>
        /// Checks if an executor is registered for a block type
        /// </summary>
        bool IsRegistered(BlockType blockType);

        /// <summary>
        /// Gets all registered block types
        /// </summary>
        IEnumerable<BlockType> GetRegisteredTypes();

        /// <summary>
        /// Unregisters a block type
        /// </summary>
        bool Unregister(BlockType blockType);

        /// <summary>
        /// Creates a default registry with all built-in block executors
        /// </summary>
        static IBlockRegistry CreateDefault(IServiceProvider serviceProvider) 
        {
            throw new NotImplementedException("Implementation will be in BlockRegistry class");
        }
    }
}
