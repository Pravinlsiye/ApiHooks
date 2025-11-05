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
            
            // Replace variables in URL
            var url = _variableStore.ReplaceVariables(config.Url);
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

            // Add headers
            if (config.Headers != null)
            {
                foreach (var header in config.Headers)
                {
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
                    
                    if (response.IsSuccessStatusCode)
                        break;

                    if (attempt == retryCount)
                    {
                        var errorContent = await response.Content.ReadAsStringAsync();
                        throw new HttpRequestException(
                            $"HTTP {(int)response.StatusCode} {response.ReasonPhrase}: {errorContent}");
                    }
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

            if (response == null)
            {
                throw lastException ?? new HttpRequestException("Request failed after all retries");
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

            var outputs = new Dictionary<string, object>
            {
                ["response"] = responseData ?? new { },
                ["statusCode"] = (int)response.StatusCode,
                ["headers"] = response.Headers.ToDictionary(h => h.Key, h => string.Join(", ", h.Value)),
                ["success"] = response.IsSuccessStatusCode
            };

            // Extract variables if specified
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

            _console.Success($"HTTP {config.Method} completed with status {(int)response.StatusCode}");

            return new BlockExecutionResult
            {
                Success = response.IsSuccessStatusCode,
                Outputs = outputs
            };
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
