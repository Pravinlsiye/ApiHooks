using System.Collections.Generic;

namespace SiyeFlow.CLI.Interfaces
{
    /// <summary>
    /// Interface for managing variables during flow execution
    /// </summary>
    public interface IVariableStore
    {
        /// <summary>
        /// Sets a variable value
        /// </summary>
        void SetVariable(string name, object value);

        /// <summary>
        /// Gets a variable value
        /// </summary>
        T? GetVariable<T>(string name);

        /// <summary>
        /// Gets a variable value as object
        /// </summary>
        object? GetVariable(string name);

        /// <summary>
        /// Checks if a variable exists
        /// </summary>
        bool HasVariable(string name);

        /// <summary>
        /// Replaces variable placeholders in a string
        /// </summary>
        string ReplaceVariables(string template);

        /// <summary>
        /// Replaces variable placeholders in an object
        /// </summary>
        T ReplaceVariables<T>(T obj);

        /// <summary>
        /// Evaluates a condition expression
        /// </summary>
        bool EvaluateCondition(string condition);

        /// <summary>
        /// Gets all variables
        /// </summary>
        Dictionary<string, object> GetAllVariables();

        /// <summary>
        /// Clears all variables
        /// </summary>
        void Clear();

        /// <summary>
        /// Extracts variables from a response based on extraction rules
        /// </summary>
        void ExtractVariables(object response, Dictionary<string, string> extractionRules);
    }
}
