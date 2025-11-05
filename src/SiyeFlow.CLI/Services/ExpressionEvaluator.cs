using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.RegularExpressions;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SiyeFlow.CLI.Interfaces;

namespace SiyeFlow.CLI.Services
{
    public class ExpressionEvaluator : IExpressionEvaluator
    {
        private readonly IVariableStore _variableStore;

        public ExpressionEvaluator(IVariableStore variableStore)
        {
            _variableStore = variableStore;
        }

        public bool EvaluateCondition(string expression, Dictionary<string, object>? inputs = null)
        {
            try
            {
                var processedExpression = ReplaceVariables(expression, inputs);
                var result = EvaluateExpression(processedExpression);
                return ConvertToBoolean(result);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to evaluate expression: {expression}", ex);
            }
        }

        private string ReplaceVariables(string expression, Dictionary<string, object>? inputs)
        {
            // Replace inputs.x references first
            if (inputs != null)
            {
                foreach (var kvp in inputs)
                {
                    var pattern = $@"inputs\.{kvp.Key}(?:\.\w+)*";
                    expression = Regex.Replace(expression, pattern, match =>
                    {
                        var path = match.Value.Substring("inputs.".Length);
                        var value = GetNestedValue(inputs, path);
                        return FormatValue(value);
                    });
                }
            }

            // Replace {{variable}} references
            expression = _variableStore.ReplaceVariables(expression);

            return expression;
        }

        private object GetNestedValue(Dictionary<string, object> data, string path)
        {
            var parts = path.Split('.');
            object current = data;

            foreach (var part in parts)
            {
                if (current is Dictionary<string, object> dict)
                {
                    if (dict.TryGetValue(part, out var value))
                        current = value;
                    else
                        return null!;
                }
                else if (current is JObject jObj)
                {
                    current = jObj[part]?.ToObject<object>() ?? null!;
                }
                else
                {
                    return null!;
                }
            }

            return current;
        }

        private string FormatValue(object? value)
        {
            if (value == null)
                return "null";
            if (value is string str)
                return $"'{str}'";
            if (value is bool b)
                return b ? "true" : "false";
            if (value is DateTime dt)
                return $"'{dt:yyyy-MM-dd HH:mm:ss}'";
            
            return value.ToString() ?? "null";
        }

        private object EvaluateExpression(string expression)
        {
            // Simple expression evaluation using DataTable.Compute
            // This supports basic operations: ==, !=, <, >, <=, >=, AND, OR, NOT
            expression = expression
                .Replace("===", "=")
                .Replace("!==", "<>")
                .Replace("==", "=")
                .Replace("!=", "<>")
                .Replace("&&", "AND")
                .Replace("||", "OR")
                .Replace("!", "NOT ");

            using var table = new DataTable();
            return table.Compute(expression, null);
        }

        private bool ConvertToBoolean(object result)
        {
            if (result is bool b)
                return b;
            
            if (result is DBNull)
                return false;

            var str = result?.ToString()?.ToLower();
            return str == "true" || str == "1";
        }
    }

    public interface IExpressionEvaluator
    {
        bool EvaluateCondition(string expression, Dictionary<string, object>? inputs = null);
    }
}
