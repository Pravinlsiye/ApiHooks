using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SiyeFlow.CLI.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services
{
    /// <summary>
    /// Implementation of variable store for workflow execution
    /// </summary>
    public class VariableStore : IVariableStore
    {
        private readonly Dictionary<string, object> _variables = new();
        private readonly Regex _variableRegex = new(@"\{\{([^}]+)\}\}", RegexOptions.Compiled);

        public void SetVariable(string name, object value)
        {
            _variables[name] = value;
        }

        public T? GetVariable<T>(string name)
        {
            if (_variables.TryGetValue(name, out var value))
            {
                if (value is T typedValue)
                    return typedValue;

                try
                {
                    // Try to convert
                    var json = JsonConvert.SerializeObject(value);
                    return JsonConvert.DeserializeObject<T>(json);
                }
                catch
                {
                    return default;
                }
            }

            // Check for nested property access
            if (name.Contains('.'))
            {
                var parts = name.Split('.');
                if (_variables.TryGetValue(parts[0], out var rootValue))
                {
                    var current = rootValue;
                    for (int i = 1; i < parts.Length; i++)
                    {
                        if (current is JObject jObj)
                        {
                            current = jObj[parts[i]]?.ToObject<object>();
                        }
                        else if (current is Dictionary<string, object> dict)
                        {
                            current = dict.GetValueOrDefault(parts[i]);
                        }
                        else
                        {
                            // Use reflection for other objects
                            var prop = current?.GetType().GetProperty(parts[i]);
                            current = prop?.GetValue(current);
                        }

                        if (current == null)
                            return default;
                    }

                    if (current is T result)
                        return result;

                    try
                    {
                        var json = JsonConvert.SerializeObject(current);
                        return JsonConvert.DeserializeObject<T>(json);
                    }
                    catch
                    {
                        return default;
                    }
                }
            }

            return default;
        }

        public object? GetVariable(string name)
        {
            return GetVariable<object>(name);
        }

        public bool HasVariable(string name)
        {
            return _variables.ContainsKey(name) || 
                   (name.Contains('.') && _variables.ContainsKey(name.Split('.')[0]));
        }

        public bool RemoveVariable(string name)
        {
            return _variables.Remove(name);
        }

        public void Clear()
        {
            _variables.Clear();
        }

        public Dictionary<string, object> GetAllVariables()
        {
            return new Dictionary<string, object>(_variables);
        }

        public string ReplaceVariables(string template)
        {
            if (string.IsNullOrEmpty(template))
                return template;

            return _variableRegex.Replace(template, match =>
            {
                var varName = match.Groups[1].Value.Trim();
                var value = GetVariable(varName);
                return value?.ToString() ?? match.Value;
            });
        }

        public object? ReplaceVariablesInObject(object? obj)
        {
            if (obj == null)
                return null;

            if (obj is string str)
                return ReplaceVariables(str);

            if (obj is Dictionary<string, object> dict)
            {
                var result = new Dictionary<string, object>();
                foreach (var kvp in dict)
                {
                    result[kvp.Key] = ReplaceVariablesInObject(kvp.Value);
                }
                return result;
            }

            if (obj is List<object> list)
            {
                return list.Select(item => ReplaceVariablesInObject(item)).ToList();
            }

            if (obj is JObject jObj)
            {
                var json = jObj.ToString();
                json = ReplaceVariables(json);
                return JObject.Parse(json);
            }

            if (obj is JArray jArray)
            {
                var json = jArray.ToString();
                json = ReplaceVariables(json);
                return JArray.Parse(json);
            }

            return obj;
        }

        public async Task<Dictionary<string, object>> EvaluateJsonPathAsync(
            object data, 
            Dictionary<string, string> expressions)
        {
            var results = new Dictionary<string, object>();
            var jToken = JToken.FromObject(data);

            foreach (var expr in expressions)
            {
                try
                {
                    var tokens = jToken.SelectTokens(expr.Value);
                    var tokenList = tokens.ToList();
                    
                    if (tokenList.Count == 0)
                    {
                        results[expr.Key] = null!;
                    }
                    else if (tokenList.Count == 1)
                    {
                        results[expr.Key] = ConvertJTokenToObject(tokenList[0]);
                    }
                    else
                    {
                        results[expr.Key] = tokenList.Select(ConvertJTokenToObject).ToList();
                    }
                }
                catch (Exception ex)
                {
                    results[expr.Key] = new { error = ex.Message };
                }
            }

            return results;
        }

        public Task<object?> EvaluateTypeScriptAsync(
            string code, 
            Dictionary<string, object> inputs,
            Interfaces.ExecutionContext context)
        {
            // TypeScript evaluation would require a JavaScript engine
            // For now, return a placeholder
            throw new NotImplementedException(
                "TypeScript evaluation requires a JavaScript runtime. " +
                "Consider using JSONPath for data extraction or implement a JS engine integration.");
        }

        public async Task<bool> EvaluateConditionAsync(string expression, Interfaces.ExecutionContext context)
        {
            if (string.IsNullOrWhiteSpace(expression))
                return true;

            // Replace variables in expression
            var evaluatedExpression = ReplaceVariables(expression);

            // Simple equality checks
            if (evaluatedExpression.Contains("=="))
            {
                var parts = evaluatedExpression.Split("==", StringSplitOptions.TrimEntries);
                if (parts.Length == 2)
                {
                    return parts[0].Equals(parts[1], StringComparison.OrdinalIgnoreCase);
                }
            }

            if (evaluatedExpression.Contains("!="))
            {
                var parts = evaluatedExpression.Split("!=", StringSplitOptions.TrimEntries);
                if (parts.Length == 2)
                {
                    return !parts[0].Equals(parts[1], StringComparison.OrdinalIgnoreCase);
                }
            }

            // Boolean checks
            if (bool.TryParse(evaluatedExpression, out var boolResult))
            {
                return boolResult;
            }

            // If we can't evaluate, default to true
            return true;
        }

        public IVariableStore CreateScope()
        {
            var scopedStore = new VariableStore();
            foreach (var kvp in _variables)
            {
                scopedStore.SetVariable(kvp.Key, kvp.Value);
            }
            return scopedStore;
        }

        public void MergeFrom(IVariableStore other)
        {
            var otherVars = other.GetAllVariables();
            foreach (var kvp in otherVars)
            {
                SetVariable(kvp.Key, kvp.Value);
            }
        }

        private object ConvertJTokenToObject(JToken token)
        {
            switch (token.Type)
            {
                case JTokenType.Object:
                    return token.ToObject<Dictionary<string, object>>()!;
                case JTokenType.Array:
                    return token.ToObject<List<object>>()!;
                case JTokenType.Integer:
                    return token.ToObject<long>();
                case JTokenType.Float:
                    return token.ToObject<double>();
                case JTokenType.String:
                    return token.ToObject<string>()!;
                case JTokenType.Boolean:
                    return token.ToObject<bool>();
                case JTokenType.Null:
                    return null!;
                default:
                    return token.ToString();
            }
        }
    }
}
