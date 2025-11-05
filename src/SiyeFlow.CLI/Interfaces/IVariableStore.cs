using System.Threading.Tasks;

namespace SiyeFlow.CLI.Interfaces
{
    /// <summary>
    /// Interface for managing variables and evaluating expressions in workflows
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
        /// Removes a variable
        /// </summary>
        bool RemoveVariable(string name);

        /// <summary>
        /// Clears all variables
        /// </summary>
        void Clear();

        /// <summary>
        /// Gets all variables
        /// </summary>
        Dictionary<string, object> GetAllVariables();

        /// <summary>
        /// Replaces variables in a string (e.g., "Hello {{name}}")
        /// </summary>
        string ReplaceVariables(string template);

        /// <summary>
        /// Replaces variables in an object (deep replacement)
        /// </summary>
        object? ReplaceVariablesInObject(object? obj);

        /// <summary>
        /// Evaluates a JSONPath expression
        /// </summary>
        Task<Dictionary<string, object>> EvaluateJsonPathAsync(
            object data,
            Dictionary<string, string> expressions);

        /// <summary>
        /// Evaluates TypeScript code
        /// </summary>
        Task<object?> EvaluateTypeScriptAsync(
            string code,
            Dictionary<string, object> inputs,
            ExecutionContext context);

        /// <summary>
        /// Evaluates a condition expression
        /// </summary>
        Task<bool> EvaluateConditionAsync(string expression, ExecutionContext context);

        /// <summary>
        /// Creates a scoped variable store for isolated execution
        /// </summary>
        IVariableStore CreateScope();

        /// <summary>
        /// Merges variables from another store
        /// </summary>
        void MergeFrom(IVariableStore other);
    }

    /// <summary>
    /// Extensions for variable store
    /// </summary>
    public static class VariableStoreExtensions
    {
        /// <summary>
        /// Sets multiple variables at once
        /// </summary>
        public static void SetVariables(this IVariableStore store, Dictionary<string, object> variables)
        {
            foreach (var kvp in variables)
            {
                store.SetVariable(kvp.Key, kvp.Value);
            }
        }

        /// <summary>
        /// Gets a variable with a default value if not found
        /// </summary>
        public static T GetVariableOrDefault<T>(this IVariableStore store, string name, T defaultValue)
        {
            return store.HasVariable(name) ? store.GetVariable<T>(name) ?? defaultValue : defaultValue;
        }
    }
}
