using SiyeFlow.CLI.Models;
using System;

namespace SiyeFlow.CLI.Interfaces
{
    /// <summary>
    /// Interface for writing formatted output to console
    /// </summary>
    public interface IConsoleWriter
    {
        /// <summary>
        /// Writes an informational message
        /// </summary>
        void Info(string message);

        /// <summary>
        /// Writes a success message
        /// </summary>
        void Success(string message);

        /// <summary>
        /// Writes a warning message
        /// </summary>
        void Warning(string message);

        /// <summary>
        /// Writes an error message
        /// </summary>
        void Error(string message);

        /// <summary>
        /// Writes a debug message
        /// </summary>
        void Debug(string message);

        /// <summary>
        /// Writes a step execution start message
        /// </summary>
        void StepStart(FlowStep step);

        /// <summary>
        /// Writes a step execution result
        /// </summary>
        void StepResult(StepResult result);

        /// <summary>
        /// Writes the flow execution summary
        /// </summary>
        void FlowSummary(FlowExecutionResult result);

        /// <summary>
        /// Writes a progress indicator
        /// </summary>
        void Progress(string message, int current, int total);

        /// <summary>
        /// Writes a separator line
        /// </summary>
        void Separator();

        /// <summary>
        /// Writes an empty line
        /// </summary>
        void EmptyLine();

        /// <summary>
        /// Writes the help text
        /// </summary>
        void ShowHelp();
    }
}
