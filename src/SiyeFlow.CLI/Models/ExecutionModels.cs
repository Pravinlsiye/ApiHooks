using Microsoft.OpenApi.Models;
using System;
using System.Collections.Generic;

namespace SiyeFlow.CLI.Interfaces
{
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
        
        /// <summary>
        /// Stores output values by block ID and port name
        /// BlockOutputs[blockId][portName] = value
        /// </summary>
        public Dictionary<string, Dictionary<string, object>> BlockOutputs { get; set; } = new();
        
        /// <summary>
        /// Workflow input values for Start block
        /// </summary>
        public Dictionary<string, object> WorkflowInputs { get; set; } = new();
        
        // For loops
        public int? LoopIndex { get; set; }
        public object? LoopItem { get; set; }
        public int? LoopTotal { get; set; }
        
        // For error handling
        public Exception? CurrentError { get; set; }
        public int? RetryAttempt { get; set; }
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
