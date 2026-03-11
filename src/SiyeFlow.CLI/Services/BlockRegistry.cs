using Microsoft.Extensions.DependencyInjection;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using SiyeFlow.CLI.Services.Blocks;
using System;
using System.Collections.Generic;

namespace SiyeFlow.CLI.Services
{
    /// <summary>
    /// Registry for managing block executors
    /// </summary>
    public class BlockRegistry : IBlockRegistry
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly Dictionary<BlockType, Type> _executorTypes = new();
        private readonly Dictionary<BlockType, IBlockExecutor> _executorInstances = new();

        public BlockRegistry(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
            RegisterDefaultExecutors();
        }

        public void Register<TExecutor>(BlockType blockType) where TExecutor : IBlockExecutor
        {
            _executorTypes[blockType] = typeof(TExecutor);
            _executorInstances.Remove(blockType); // Clear any cached instance
        }

        public void Register(BlockType blockType, IBlockExecutor executor)
        {
            _executorInstances[blockType] = executor ?? throw new ArgumentNullException(nameof(executor));
            _executorTypes.Remove(blockType); // Remove type registration
        }

        public IBlockExecutor? GetExecutor(BlockType blockType)
        {
            // Check for registered instance first
            if (_executorInstances.TryGetValue(blockType, out var instance))
            {
                return instance;
            }

            // Check for registered type
            if (_executorTypes.TryGetValue(blockType, out var executorType))
            {
                try
                {
                    var executor = (IBlockExecutor)_serviceProvider.GetRequiredService(executorType);
                    return executor;
                }
                catch (Exception ex)
                {
                    throw new InvalidOperationException(
                        $"Failed to create executor for block type {blockType}. " +
                        $"Make sure {executorType.Name} is registered in dependency injection.", ex);
                }
            }

            return null;
        }

        public IBlockExecutor? GetExecutor(Node node)
        {
            if (node == null)
                throw new ArgumentNullException(nameof(node));

            return GetExecutor(node.Type);
        }

        public bool IsRegistered(BlockType blockType)
        {
            return _executorTypes.ContainsKey(blockType) || _executorInstances.ContainsKey(blockType);
        }

        public IEnumerable<BlockType> GetRegisteredTypes()
        {
            var types = new HashSet<BlockType>();
            
            foreach (var key in _executorTypes.Keys)
                types.Add(key);
                
            foreach (var key in _executorInstances.Keys)
                types.Add(key);
                
            return types;
        }

        public bool Unregister(BlockType blockType)
        {
            var removed = _executorTypes.Remove(blockType);
            removed |= _executorInstances.Remove(blockType);
            return removed;
        }

        private void RegisterDefaultExecutors()
        {
            // Register all built-in block executors
            Register<StartBlockExecutor>(BlockType.Start);
            Register<EndBlockExecutor>(BlockType.End);
            Register<HttpRequestBlockExecutor>(BlockType.HttpRequest);
            Register<VariableBlockExecutor>(BlockType.Variable);
            Register<LogBlockExecutor>(BlockType.Log);
            Register<DelayBlockExecutor>(BlockType.Delay);
            Register<ConditionBlockExecutor>(BlockType.Condition);
            Register<LoopBlockExecutor>(BlockType.Loop);
            Register<EvaluateBlockExecutor>(BlockType.Evaluate);
            Register<SubWorkflowBlockExecutor>(BlockType.SubWorkflow);
        }

        public static IBlockRegistry CreateDefault(IServiceProvider serviceProvider)
        {
            return new BlockRegistry(serviceProvider);
        }
    }
}
