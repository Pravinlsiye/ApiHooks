using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SiyeFlow.CLI.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace SiyeFlow.CLI.Services
{
    /// <summary>
    /// Service for managing variables during flow execution
    /// </summary>
    public class VariableStore : IVariableStore
    {
        private readonly Dictionary<string, object> _variables = new();
        private readonly ILogger<VariableStore> _logger;
        private readonly Regex _variablePattern = new(@"\{\{(\w+(?:\.\w+)*)\}\}", RegexOptions.Compiled);

        public VariableStore(ILogger<VariableStore> logger)
        {
            _logger = logger;
        }

        /// <inheritdoc />
        public void SetVariable(string name, object value)
        {
            _variables[name] = value;
            _logger.LogDebug("Set variable '{Name}' = {Value}", name, JsonConvert.SerializeObject(value));
        }

        /// <inheritdoc />
        public T? GetVariable<T>(string name)
        {
            var value = GetVariable(name);
            if (value == null) return default;

            try
            {
                if (value is T typedValue)
                    return typedValue;

                if (value is JToken jToken)
                    return jToken.ToObject<T>();

                var json = JsonConvert.SerializeObject(value);
                return JsonConvert.DeserializeObject<T>(json);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to convert variable '{Name}' to type {Type}", name, typeof(T).Name);
                return default;
            }
        }

        /// <inheritdoc />
        public object? GetVariable(string name)
        {
            // Support nested property access (e.g., "response.data.id")
            var parts = name.Split('.');
            object? current = null;

            if (_variables.TryGetValue(parts[0], out current))
            {
                for (int i = 1; i < parts.Length && current != null; i++)
                {
                    if (current is JObject jObj)
                    {
                        current = jObj[parts[i]];
                    }
                    else if (current is Dictionary<string, object> dict)
                    {
                        dict.TryGetValue(parts[i], out current);
                    }
                    else
                    {
                        var property = current.GetType().GetProperty(parts[i]);
                        current = property?.GetValue(current);
                    }
                }
            }

            return current;
        }

        /// <inheritdoc />
        public bool HasVariable(string name)
        {
            return GetVariable(name) != null;
        }

        /// <inheritdoc />
        public string ReplaceVariables(string template)
        {
            if (string.IsNullOrEmpty(template))
                return template;

            return _variablePattern.Replace(template, match =>
            {
                var variableName = match.Groups[1].Value;
                var value = GetVariable(variableName);
                
                if (value == null)
                {
                    _logger.LogWarning("Variable '{Name}' not found in template", variableName);
                    return match.Value;
                }

                return value.ToString() ?? string.Empty;
            });
        }

        /// <inheritdoc />
        public T ReplaceVariables<T>(T obj)
        {
            if (obj == null) return obj;

            var json = JsonConvert.SerializeObject(obj);
            var replacedJson = ReplaceVariables(json);
            
            if (json == replacedJson)
                return obj;

            try
            {
                return JsonConvert.DeserializeObject<T>(replacedJson)!;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deserialize object after variable replacement");
                return obj;
            }
        }

        /// <inheritdoc />
        public bool EvaluateCondition(string condition)
        {
            if (string.IsNullOrWhiteSpace(condition))
                return true;

            try
            {
                // Replace variables in condition
                var evaluatedCondition = ReplaceVariables(condition);

                // Simple condition evaluation (can be enhanced with expression evaluator)
                // For now, supports basic equality and comparison
                if (evaluatedCondition.Contains("=="))
                {
                    var parts = evaluatedCondition.Split("==", StringSplitOptions.TrimEntries);
                    if (parts.Length == 2)
                    {
                        return parts[0].Equals(parts[1], StringComparison.OrdinalIgnoreCase);
                    }
                }
                else if (evaluatedCondition.Contains("!="))
                {
                    var parts = evaluatedCondition.Split("!=", StringSplitOptions.TrimEntries);
                    if (parts.Length == 2)
                    {
                        return !parts[0].Equals(parts[1], StringComparison.OrdinalIgnoreCase);
                    }
                }
                else if (bool.TryParse(evaluatedCondition, out var boolResult))
                {
                    return boolResult;
                }

                _logger.LogWarning("Unable to evaluate condition: {Condition}", condition);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error evaluating condition: {Condition}", condition);
                return true;
            }
        }

        /// <inheritdoc />
        public Dictionary<string, object> GetAllVariables()
        {
            return new Dictionary<string, object>(_variables);
        }

        /// <inheritdoc />
        public void Clear()
        {
            _variables.Clear();
            _logger.LogDebug("Cleared all variables");
        }

        /// <inheritdoc />
        public void ExtractVariables(object response, Dictionary<string, string> extractionRules)
        {
            if (response == null || extractionRules == null || extractionRules.Count == 0)
                return;

            JObject? responseObj = null;
            
            if (response is string jsonString)
            {
                try
                {
                    responseObj = JObject.Parse(jsonString);
                }
                catch
                {
                    // If it's not JSON, store as is
                    if (extractionRules.ContainsKey("response"))
                    {
                        SetVariable(extractionRules["response"], response);
                    }
                    return;
                }
            }
            else
            {
                responseObj = JObject.FromObject(response);
            }

            foreach (var rule in extractionRules)
            {
                try
                {
                    var token = responseObj.SelectToken(rule.Value);
                    if (token != null)
                    {
                        SetVariable(rule.Key, token.ToObject<object>()!);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to extract variable '{Name}' using path '{Path}'", 
                        rule.Key, rule.Value);
                }
            }
        }
    }
}
