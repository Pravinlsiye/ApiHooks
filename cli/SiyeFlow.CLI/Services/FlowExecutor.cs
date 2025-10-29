using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.CLI.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services
{
    /// <summary>
    /// Service for executing API workflows
    /// </summary>
    public class FlowExecutor : IFlowExecutor
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IVariableStore _variableStore;
        private readonly IConsoleWriter _console;
        private readonly ILogger<FlowExecutor> _logger;

        public FlowExecutor(
            IHttpClientFactory httpClientFactory,
            IVariableStore variableStore,
            IConsoleWriter console,
            ILogger<FlowExecutor> logger)
        {
            _httpClientFactory = httpClientFactory;
            _variableStore = variableStore;
            _console = console;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<FlowExecutionResult> ExecuteAsync(FlowDefinition flow, OpenApiDocument apiDocument, bool dryRun = false)
        {
            var result = new FlowExecutionResult
            {
                FlowName = flow.Name,
                StartedAt = DateTime.Now
            };

            try
            {
                _console.Info($"Starting flow execution: {flow.Name}");
                
                if (!string.IsNullOrEmpty(flow.Description))
                {
                    _console.Info(flow.Description);
                }

                // Initialize variables
                if (flow.Variables != null)
                {
                    foreach (var variable in flow.Variables)
                    {
                        _variableStore.SetVariable(variable.Key, variable.Value);
                        _console.Debug($"Set initial variable: {variable.Key}");
                    }
                }

                // Execute steps
                var currentStepIndex = 0;
                var stepResults = new Dictionary<string, StepResult>();

                while (currentStepIndex < flow.Steps.Count)
                {
                    var step = flow.Steps[currentStepIndex];
                    
                    // Check condition
                    if (!string.IsNullOrEmpty(step.Condition))
                    {
                        var conditionMet = _variableStore.EvaluateCondition(step.Condition);
                        if (!conditionMet)
                        {
                            _console.Info($"Skipping step '{step.Name}' - condition not met: {step.Condition}");
                            currentStepIndex++;
                            continue;
                        }
                    }

                    // Execute step
                    var stepResult = await ExecuteStepAsync(step, apiDocument, dryRun);
                    result.StepResults.Add(stepResult);
                    stepResults[step.Id] = stepResult;

                    // Extract variables if specified
                    if (stepResult.Success && step.ExtractVariables != null && !string.IsNullOrEmpty(stepResult.ResponseBody))
                    {
                        _variableStore.ExtractVariables(stepResult.ResponseBody, step.ExtractVariables);
                    }

                    // Handle step result
                    var nextAction = stepResult.Success ? step.OnSuccess : step.OnFailure;
                    
                    if (nextAction != null)
                    {
                        // Set variables from action
                        if (nextAction.SetVariables != null)
                        {
                            foreach (var variable in nextAction.SetVariables)
                            {
                                _variableStore.SetVariable(variable.Key, variable.Value);
                            }
                        }

                        // Handle stop
                        if (nextAction.Stop == true)
                        {
                            _console.Info("Flow stopped by step action");
                            break;
                        }

                        // Handle goto
                        if (!string.IsNullOrEmpty(nextAction.Goto))
                        {
                            var targetIndex = flow.Steps.FindIndex(s => s.Id == nextAction.Goto);
                            if (targetIndex >= 0)
                            {
                                currentStepIndex = targetIndex;
                                _console.Info($"Jumping to step: {nextAction.Goto}");
                                continue;
                            }
                            else
                            {
                                _console.Warning($"Target step not found: {nextAction.Goto}");
                            }
                        }
                    }

                    currentStepIndex++;
                }

                result.Success = result.StepResults.All(r => r.Success);
                result.FinalVariables = _variableStore.GetAllVariables();
                result.CompletedAt = DateTime.Now;

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Flow execution failed");
                result.Success = false;
                result.CompletedAt = DateTime.Now;
                return result;
            }
        }

        /// <inheritdoc />
        public async Task<StepResult> ExecuteStepAsync(FlowStep step, OpenApiDocument apiDocument, bool dryRun = false)
        {
            var stopwatch = Stopwatch.StartNew();
            var result = new StepResult
            {
                StepId = step.Id,
                StepName = step.Name,
                ExecutedAt = DateTime.Now
            };

            try
            {
                _console.StepStart(step);

                // Find the operation
                var operation = FindOperation(apiDocument, step);
                if (operation == null)
                {
                    throw new InvalidOperationException($"Operation not found: {step.OperationId ?? step.Path}");
                }

                // Build request
                var request = BuildHttpRequest(step, operation.Value.Item1, operation.Value.Item2, operation.Value.Item3, operation.Value.Item4, apiDocument);
                
                if (dryRun)
                {
                    _console.Info("DRY RUN - Request would be sent:");
                    _console.Info($"  URL: {request.RequestUri}");
                    _console.Info($"  Method: {request.Method}");
                    
                    if (request.Headers.Any())
                    {
                        _console.Info("  Headers:");
                        foreach (var header in request.Headers)
                        {
                            _console.Info($"    {header.Key}: {string.Join(", ", header.Value)}");
                        }
                    }

                    if (request.Content != null)
                    {
                        var content = await request.Content.ReadAsStringAsync();
                        _console.Info($"  Body: {content}");
                    }

                    result.Success = true;
                    result.StatusCode = 200;
                    result.ResponseBody = "{ \"dryRun\": true }";
                }
                else
                {
                    // Execute request
                    var httpClient = _httpClientFactory.CreateClient();
                    
                    // Set timeout if specified
                    if (step.Timeout.HasValue)
                    {
                        httpClient.Timeout = TimeSpan.FromSeconds(step.Timeout.Value);
                    }

                    // Execute with retries
                    var retries = step.Retries ?? 0;
                    HttpResponseMessage? response = null;
                    
                    for (int attempt = 0; attempt <= retries; attempt++)
                    {
                        if (attempt > 0)
                        {
                            _console.Info($"Retry attempt {attempt} of {retries}");
                            await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt - 1))); // Exponential backoff
                        }

                        try
                        {
                            response = await httpClient.SendAsync(request);
                            if (response.IsSuccessStatusCode || attempt == retries)
                            {
                                break;
                            }
                        }
                        catch (Exception ex) when (attempt < retries)
                        {
                            _console.Warning($"Request failed: {ex.Message}");
                        }
                    }

                    if (response != null)
                    {
                        result.StatusCode = (int)response.StatusCode;
                        result.Success = response.IsSuccessStatusCode;
                        result.ResponseBody = await response.Content.ReadAsStringAsync();
                        result.ResponseHeaders = response.Headers.ToDictionary(
                            h => h.Key,
                            h => string.Join(", ", h.Value)
                        );

                        if (!response.IsSuccessStatusCode)
                        {
                            result.Error = $"HTTP {result.StatusCode}: {response.ReasonPhrase}";
                        }
                    }
                    else
                    {
                        throw new HttpRequestException("Failed to get response after all retries");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Step execution failed: {StepName}", step.Name);
                result.Success = false;
                result.Error = ex.Message;
            }
            finally
            {
                stopwatch.Stop();
                result.Duration = stopwatch.Elapsed;
                _console.StepResult(result);
            }

            return result;
        }

        private (OpenApiPathItem, OpenApiOperation, string, OperationType)? FindOperation(
            OpenApiDocument document, 
            FlowStep step)
        {
            // Try to find by operationId first
            if (!string.IsNullOrEmpty(step.OperationId))
            {
                foreach (var path in document.Paths)
                {
                    foreach (var operation in path.Value.Operations)
                    {
                        if (operation.Value.OperationId == step.OperationId)
                        {
                            return (path.Value, operation.Value, path.Key, operation.Key);
                        }
                    }
                }
            }

            // Try to find by path and method
            if (!string.IsNullOrEmpty(step.Path) && !string.IsNullOrEmpty(step.Method))
            {
                if (document.Paths.TryGetValue(step.Path, out var pathItem))
                {
                    if (Enum.TryParse<OperationType>(step.Method, true, out var operationType))
                    {
                        if (pathItem.Operations.TryGetValue(operationType, out var operation))
                        {
                            return (pathItem, operation, step.Path, operationType);
                        }
                    }
                }
            }

            return null;
        }

        private HttpRequestMessage BuildHttpRequest(
            FlowStep step,
            OpenApiPathItem pathItem,
            OpenApiOperation operation,
            string operationPath,
            OperationType operationType,
            OpenApiDocument document)
        {
            var server = document.Servers.FirstOrDefault() ?? new OpenApiServer { Url = "http://localhost" };
            var baseUrl = _variableStore.ReplaceVariables(server.Url);
            var path = _variableStore.ReplaceVariables(operationPath);

            // Build URL with parameters
            var url = BuildUrl(baseUrl, path, step.Parameters, operation.Parameters);
            
            // Use the method from OpenAPI when operationId is used, otherwise use step.Method
            var method = !string.IsNullOrEmpty(step.OperationId) 
                ? new HttpMethod(operationType.ToString().ToUpper())
                : new HttpMethod(step.Method?.ToUpper() ?? "GET");
            var request = new HttpRequestMessage(method, url);

            // Add headers
            if (step.Headers != null)
            {
                foreach (var header in step.Headers)
                {
                    var value = _variableStore.ReplaceVariables(header.Value);
                    request.Headers.TryAddWithoutValidation(header.Key, value);
                }
            }

            // Add body
            if (step.Body != null && (method == HttpMethod.Post || method == HttpMethod.Put || method == HttpMethod.Patch))
            {
                var bodyContent = _variableStore.ReplaceVariables(step.Body);
                var contentType = step.Headers?.GetValueOrDefault("Content-Type") ?? "application/json";
                
                if (bodyContent is string bodyString)
                {
                    request.Content = new StringContent(bodyString, Encoding.UTF8, contentType);
                }
                else
                {
                    var json = JsonConvert.SerializeObject(bodyContent);
                    request.Content = new StringContent(json, Encoding.UTF8, "application/json");
                }
            }

            return request;
        }

        private string BuildUrl(
            string baseUrl, 
            string path, 
            Dictionary<string, object>? parameters,
            IList<OpenApiParameter> openApiParameters)
        {
            var url = baseUrl.TrimEnd('/') + "/" + path.TrimStart('/');

            if (parameters == null || parameters.Count == 0)
                return url;

            var pathParams = new Dictionary<string, string>();
            var queryParams = new Dictionary<string, string>();

            foreach (var param in parameters)
            {
                var value = _variableStore.ReplaceVariables(param.Value?.ToString() ?? string.Empty);
                
                // Check if it's a path parameter
                var openApiParam = openApiParameters.FirstOrDefault(p => p.Name == param.Key);
                if (openApiParam?.In == ParameterLocation.Path)
                {
                    pathParams[param.Key] = value;
                }
                else
                {
                    queryParams[param.Key] = value;
                }
            }

            // Replace path parameters
            foreach (var param in pathParams)
            {
                url = url.Replace($"{{{param.Key}}}", Uri.EscapeDataString(param.Value));
            }

            // Add query parameters
            if (queryParams.Count > 0)
            {
                var queryString = string.Join("&", queryParams.Select(p => 
                    $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));
                url += "?" + queryString;
            }

            return url;
        }
    }
}
