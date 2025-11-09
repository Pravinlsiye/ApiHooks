using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    /// <summary>
    /// Executor for HTTP Request blocks
    /// </summary>
    public class HttpRequestBlockExecutor : BlockExecutorBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IApiDefinitionLoader _apiDefinitionLoader;

        public HttpRequestBlockExecutor(
            ILogger<HttpRequestBlockExecutor> logger,
            IVariableStore variableStore,
            IConsoleWriter console,
            IHttpClientFactory httpClientFactory,
            IApiDefinitionLoader apiDefinitionLoader) 
            : base(logger, variableStore, console)
        {
            _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
            _apiDefinitionLoader = apiDefinitionLoader ?? throw new ArgumentNullException(nameof(apiDefinitionLoader));
        }

        public override BlockType BlockType => BlockType.HttpRequest;

        protected override async Task<BlockExecutionResult> ExecuteInternalAsync(
            WorkflowBlock block,
            Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context,
            CancellationToken cancellationToken)
        {
            var httpBlock = CastBlock<HttpRequestBlock>(block);
            var config = httpBlock.Config;
            
            // Start with config URL
            string url = config.Url;
            
            // Replace variables from port inputs directly into URL template
            if (inputs != null)
            {
                foreach (var input in inputs)
                {
                    if (input.Value != null)
                    {
                        var placeholder = $"{{{{{input.Key}}}}}";
                        if (url.Contains(placeholder))
                        {
                            url = url.Replace(placeholder, input.Value.ToString() ?? string.Empty);
                        }
                        // Also store in variable store for potential use in body/headers
                        _variableStore.SetVariable(input.Key, input.Value);
                    }
                }
            }
            
            // Replace any remaining variables from variable store
            url = _variableStore.ReplaceVariables(url);
            
            _console.Debug($"Request URL: {url}");

            if (context.DryRun)
            {
                _console.Info($"[DRY RUN] Would execute: {config.Method} {url}");
                return new BlockExecutionResult
                {
                    Success = true,
                    Outputs = new Dictionary<string, object>
                    {
                        ["response"] = new { dryRun = true, url, method = config.Method }
                    }
                };
            }

            using var httpClient = _httpClientFactory.CreateClient();
            
            // Configure timeout
            if (config.Timeout.HasValue)
            {
                httpClient.Timeout = TimeSpan.FromMilliseconds(config.Timeout.Value);
            }

            // Prepare request
            var request = new HttpRequestMessage(new HttpMethod(config.Method), url);

            // Process headers from port inputs if available (inputs override config)
            if (inputs != null)
            {
                foreach (var input in inputs)
                {
                    // Skip url input as it's handled separately
                    if (input.Key == "url")
                        continue;
                    
                    // Add headers from port inputs
                    if (input.Value != null)
                    {
                        var headerValue = input.Value.ToString() ?? string.Empty;
                        headerValue = _variableStore.ReplaceVariables(headerValue);
                        request.Headers.TryAddWithoutValidation(input.Key, headerValue);
                    }
                }
            }
            
            // Add headers from config (only if not already set by port inputs)
            if (config.Headers != null)
            {
                foreach (var header in config.Headers)
                {
                    // Don't override if already set from port inputs
                    if (inputs != null && inputs.ContainsKey(header.Key))
                        continue;
                        
                    var headerValue = _variableStore.ReplaceVariables(header.Value);
                    request.Headers.TryAddWithoutValidation(header.Key, headerValue);
                }
            }

            // Add body
            if (config.Body != null)
            {
                var processedBody = _variableStore.ReplaceVariablesInObject(config.Body);
                var jsonBody = JsonConvert.SerializeObject(processedBody);
                request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                _console.Debug($"Request body: {jsonBody}");
            }

            // Execute request with retry logic
            var retryCount = config.Retries ?? 0;
            var attempt = 0;
            HttpResponseMessage? response = null;
            Exception? lastException = null;

            while (attempt <= retryCount)
            {
                try
                {
                    if (attempt > 0)
                    {
                        _console.Info($"Retry attempt {attempt}/{retryCount}");
                        await Task.Delay(Math.Min(1000 * (int)Math.Pow(2, attempt - 1), 30000), cancellationToken);
                    }

                    response = await httpClient.SendAsync(request, cancellationToken);
                    
                    // Break on last attempt regardless of status
                    if (attempt == retryCount)
                        break;
                    
                    // Check if status is considered success
                    var requestSuccess = response.IsSuccessStatusCode;
                    if (config.SuccessCodes != null && config.SuccessCodes.Count > 0)
                    {
                        requestSuccess = config.SuccessCodes.Contains((int)response.StatusCode);
                    }
                    
                    if (requestSuccess)
                        break;
                }
                catch (HttpRequestException ex) when (attempt < retryCount)
                {
                    lastException = ex;
                    _console.Warning($"Request failed: {ex.Message}");
                }
                catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested && attempt < retryCount)
                {
                    lastException = ex;
                    _console.Warning("Request timed out");
                }

                attempt++;
            }

            // Handle failure after all retries
            if (response == null)
            {
                // Network/connection failure - output to fail port
                var failOutputs = new Dictionary<string, object>
                {
                    ["fail"] = new
                    {
                        error = lastException?.Message ?? "Request failed after all retries",
                        errorMessage = lastException?.Message ?? "Request failed after all retries"
                    },
                    ["error"] = lastException?.Message ?? "Request failed after all retries",
                    ["errorMessage"] = lastException?.Message ?? "Request failed after all retries"
                };
                
                return new BlockExecutionResult
                {
                    Success = true, // Always true to allow port-based routing
                    Outputs = failOutputs
                };
            }

            // Process response
            var responseContent = await response.Content.ReadAsStringAsync();
            _console.Debug($"Response: {(int)response.StatusCode} - {responseContent}");

            object? responseData = null;
            if (!string.IsNullOrEmpty(responseContent))
            {
                try
                {
                    responseData = JsonConvert.DeserializeObject(responseContent);
                }
                catch
                {
                    responseData = responseContent;
                }
            }

            // Determine if request was successful based on status code
            var statusCode = (int)response.StatusCode;
            bool isSuccess;
            
            // Check if custom evaluator is specified (TypeScript/JavaScript code)
            if (!string.IsNullOrWhiteSpace(config.SuccessEvaluator))
            {
                isSuccess = await EvaluateSuccessAsync(config.SuccessEvaluator, config.EvaluatorLanguage, statusCode, responseData, response);
            }
            // Check custom success codes if specified
            else if (config.SuccessCodes != null && config.SuccessCodes.Count > 0)
            {
                isSuccess = config.SuccessCodes.Contains(statusCode);
            }
            // Default: 2xx status codes are success
            else
            {
                isSuccess = statusCode >= 200 && statusCode < 300;
            }

            var outputs = new Dictionary<string, object>
            {
                ["response"] = responseData ?? new { },
                ["status"] = statusCode,
                ["statusCode"] = statusCode, // Keep for backward compatibility
                ["headers"] = response.Headers.ToDictionary(h => h.Key, h => string.Join(", ", h.Value))
            };

            // Extract variables if specified (JSONPath on response body)
            if (httpBlock.Outputs != null && responseData != null)
            {
                var jsonPathResults = await _variableStore.EvaluateJsonPathAsync(
                    responseData,
                    httpBlock.Outputs);
                
                foreach (var result in jsonPathResults)
                {
                    outputs[result.Key] = result.Value;
                    // Also store in variable store for subsequent blocks
                    _variableStore.SetVariable(result.Key, result.Value);
                    _console.Debug($"Extracted '{result.Key}': {JsonConvert.SerializeObject(result.Value)}");
                }
            }

            // Output to success or fail port based on status
            if (isSuccess)
            {
                // Success port gets the response data
                outputs["success"] = responseData ?? new { };
                _console.Success($"HTTP {config.Method} {url} completed with status {statusCode}");
            }
            else
            {
                // Fail port gets error details
                outputs["fail"] = new
                {
                    statusCode = statusCode,
                    statusText = response.ReasonPhrase,
                    body = responseData,
                    error = $"HTTP {statusCode} {response.ReasonPhrase}"
                };
                outputs["error"] = $"HTTP {statusCode} {response.ReasonPhrase}";
                outputs["errorMessage"] = responseContent;
                _console.Warning($"HTTP {config.Method} {url} failed with status {statusCode}");
            }

            // Always return Success=true to allow WorkflowExecutor to route via ports
            return new BlockExecutionResult
            {
                Success = true,
                Outputs = outputs
            };
        }

        /// <summary>
        /// Evaluate success using custom TypeScript/JavaScript code
        /// </summary>
        private async Task<bool> EvaluateSuccessAsync(
            string evaluatorCode, 
            string? language, 
            int statusCode, 
            object? responseData,
            HttpResponseMessage response)
        {
            try
            {
                // TODO: Implement actual JavaScript/TypeScript execution
                // For now, we'll use a simple expression evaluator
                
                // Create evaluation context with available variables
                var evalContext = new Dictionary<string, object>
                {
                    ["statusCode"] = statusCode,
                    ["status"] = statusCode,
                    ["response"] = responseData ?? new { },
                    ["body"] = responseData ?? new { },
                    ["headers"] = response.Headers.ToDictionary(h => h.Key, h => string.Join(", ", h.Value))
                };
                
                // Simple evaluation: check if code is a boolean expression
                // Examples: 
                //   "statusCode === 200"
                //   "statusCode >= 200 && statusCode < 300"
                //   "statusCode === 200 || statusCode === 201"
                
                var code = evaluatorCode.Trim();
                
                // Replace JavaScript operators with C# equivalents
                code = code.Replace("===", "==")
                          .Replace("!==", "!=")
                          .Replace("&&", "and")
                          .Replace("||", "or");
                
                // Simple parser for basic boolean expressions
                var result = EvaluateBooleanExpression(code, evalContext);
                
                _console.Debug($"Success evaluator result: {result} (code: {evaluatorCode})");
                
                return await Task.FromResult(result);
            }
            catch (Exception ex)
            {
                _console.Warning($"Failed to evaluate success condition: {ex.Message}. Falling back to default.");
                // Fall back to default 2xx check
                return statusCode >= 200 && statusCode < 300;
            }
        }
        
        /// <summary>
        /// Simple boolean expression evaluator
        /// </summary>
        private bool EvaluateBooleanExpression(string expression, Dictionary<string, object> context)
        {
            // Handle 'and' operator
            if (expression.Contains(" and "))
            {
                var parts = expression.Split(new[] { " and " }, StringSplitOptions.None);
                return parts.All(part => EvaluateBooleanExpression(part.Trim(), context));
            }
            
            // Handle 'or' operator
            if (expression.Contains(" or "))
            {
                var parts = expression.Split(new[] { " or " }, StringSplitOptions.None);
                return parts.Any(part => EvaluateBooleanExpression(part.Trim(), context));
            }
            
            // Handle comparison operators
            var operators = new[] { ">=", "<=", "==", "!=", ">", "<" };
            foreach (var op in operators)
            {
                if (expression.Contains(op))
                {
                    var parts = expression.Split(new[] { op }, 2, StringSplitOptions.None);
                    if (parts.Length == 2)
                    {
                        var left = EvaluateValue(parts[0].Trim(), context);
                        var right = EvaluateValue(parts[1].Trim(), context);
                        
                        return op switch
                        {
                            "==" => Equals(left, right),
                            "!=" => !Equals(left, right),
                            ">" => Compare(left, right) > 0,
                            "<" => Compare(left, right) < 0,
                            ">=" => Compare(left, right) >= 0,
                            "<=" => Compare(left, right) <= 0,
                            _ => false
                        };
                    }
                }
            }
            
            // Direct boolean value
            if (bool.TryParse(expression, out var boolResult))
            {
                return boolResult;
            }
            
            return false;
        }
        
        /// <summary>
        /// Evaluate a value (variable or literal)
        /// </summary>
        private object EvaluateValue(string value, Dictionary<string, object> context)
        {
            // Check if it's a variable
            if (context.TryGetValue(value, out var contextValue))
            {
                return contextValue;
            }
            
            // Try parse as number
            if (int.TryParse(value, out var intValue))
            {
                return intValue;
            }
            
            // Try parse as boolean
            if (bool.TryParse(value, out var boolValue))
            {
                return boolValue;
            }
            
            // Return as string (remove quotes if present)
            return value.Trim('"', '\'');
        }
        
        /// <summary>
        /// Compare two values
        /// </summary>
        private int Compare(object left, object right)
        {
            if (left is int leftInt && right is int rightInt)
            {
                return leftInt.CompareTo(rightInt);
            }
            
            if (left is string leftStr && right is string rightStr)
            {
                return string.Compare(leftStr, rightStr, StringComparison.Ordinal);
            }
            
            return 0;
        }

        public override Task<ValidationResult> ValidateAsync(WorkflowBlock block, Interfaces.ExecutionContext context)
        {
            var result = new ValidationResult { IsValid = true };

            try
            {
                var httpBlock = CastBlock<HttpRequestBlock>(block);
                var config = httpBlock.Config;

                // Validate URL
                if (string.IsNullOrWhiteSpace(config.Url))
                {
                    result.IsValid = false;
                    result.Errors.Add("HTTP request URL is required");
                }

                // Validate method
                var validMethods = new[] { "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS" };
                if (!validMethods.Contains(config.Method.ToUpper()))
                {
                    result.IsValid = false;
                    result.Errors.Add($"Invalid HTTP method: {config.Method}");
                }

                // Warn about body on GET/HEAD/DELETE
                if (config.Body != null && new[] { "GET", "HEAD", "DELETE" }.Contains(config.Method.ToUpper()))
                {
                    result.Warnings.Add($"HTTP {config.Method} typically should not have a request body");
                }

                // Validate timeout
                if (config.Timeout.HasValue && config.Timeout.Value <= 0)
                {
                    result.IsValid = false;
                    result.Errors.Add("Timeout must be greater than 0");
                }

                // Validate retries
                if (config.Retries.HasValue && config.Retries.Value < 0)
                {
                    result.IsValid = false;
                    result.Errors.Add("Retries cannot be negative");
                }
            }
            catch (Exception ex)
            {
                result.IsValid = false;
                result.Errors.Add($"Invalid HTTP request block configuration: {ex.Message}");
            }

            return Task.FromResult(result);
        }
    }
}
