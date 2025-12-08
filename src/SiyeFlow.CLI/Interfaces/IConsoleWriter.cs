using SiyeFlow.Core.Models;
using System;

namespace SiyeFlow.CLI.Interfaces
{
    /// <summary>
    /// Interface for writing formatted output to console
    /// </summary>
    public interface IConsoleWriter
    {
        void Info(string message);
        void Success(string message);
        void Warning(string message);
        void Error(string message);
        void Debug(string message);
        void BlockStart(Node node); // Updated from WorkflowBlock
        void BlockResult(string blockId, BlockExecutionResult result);
        void WorkflowSummary(WorkflowExecutionResult result);
        void Progress(string message, int current, int total);
        void Separator();
        void EmptyLine();
        void ShowHelp();
    }
}
