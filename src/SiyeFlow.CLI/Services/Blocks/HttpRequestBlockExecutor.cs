using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
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
            Node node,
            Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context,
            CancellationToken cancellationToken)
        {
            var config = GetConfig<HttpRequestConfig>(node);
            
            // 1. Resolve URL
            string url = _variableStore.ReplaceVariables(config.Url);
            _console.Debug($"Request URL: {url}");

            if (context.DryRun)
            {
                _console.Info($"[DRY RUN] Would execute: {config.Method} {url}");
                return new BlockExecutionResult
                {
                    Success = true,
                    Outputs = new Dictionary<string, object> { ["response"] = new { dryRun = true } }
                };
            }

            using var httpClient = _httpClientFactory.CreateClient();
            if (config.Timeout.HasValue)
                httpClient.Timeout = TimeSpan.FromMilliseconds(config.Timeout.Value);

            var request = new HttpRequestMessage(new HttpMethod(config.Method), url);

            // 2. Headers
            if (config.Headers != null)
            {
                foreach (var header in config.Headers)
                {
                    var val = _variableStore.ReplaceVariables(header.Value);
                    request.Headers.TryAddWithoutValidation(header.Key, val);
                }
            }

            // 3. Body
            if (config.Body != null)
            {
                var processedBody = _variableStore.ReplaceVariablesInObject(config.Body);
                var jsonBody = JsonConvert.SerializeObject(processedBody);
                request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
            }

            // 4. Execute
            var response = await httpClient.SendAsync(request, cancellationToken);
            var content = await response.Content.ReadAsStringAsync();
            
            // 5. Parse Response
            object? responseData = null;
            try { responseData = JsonConvert.DeserializeObject(content); } catch { responseData = content; }

            var statusCode = (int)response.StatusCode;
            
            // 6. Evaluate Success
            bool isSuccess = response.IsSuccessStatusCode;
            if (!string.IsNullOrWhiteSpace(config.SuccessEvaluator))
            {
                isSuccess = statusCode >= 200 && statusCode < 300;
            }

            var outputs = new Dictionary<string, object>
            {
                ["status"] = statusCode,
                ["body"] = responseData ?? new { },
                ["headers"] = response.Headers.ToDictionary(h => h.Key, h => string.Join(", ", h.Value))
            };

            // 7. Extract Variables (Outputs)
            if (config.Outputs != null && responseData != null)
            {
                var jsonPathResults = await _variableStore.EvaluateJsonPathAsync(
                    responseData,
                    config.Outputs);
                
                foreach (var result in jsonPathResults)
                {
                    outputs[result.Key] = result.Value;
                    // Important: We must manually push this to variable store here
                    // because other blocks might expect it immediately?
                    // Actually, WorkflowExecutor now handles this for the final outputs map.
                    // But since EvaluateJsonPathAsync doesn't automatically set vars in VariableStore (it returns them),
                    // and we are adding them to 'outputs', WorkflowExecutor will pick them up.
                    
                    _console.Debug($"Extracted '{result.Key}': {JsonConvert.SerializeObject(result.Value)}");
                }
            }

            // 8. Route Flow
            var nextHandle = isSuccess ? "success" : "fail";
            
            if (isSuccess) _console.Success($"HTTP {config.Method} {url} - {statusCode}");
            else _console.Warning($"HTTP {config.Method} {url} - {statusCode}");

            return new BlockExecutionResult
            {
                Success = true,
                Outputs = outputs,
                NextHandle = nextHandle
            };
        }

        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
        {
            var config = GetConfig<HttpRequestConfig>(node);
            var result = new ValidationResult { IsValid = true };

            if (string.IsNullOrWhiteSpace(config.Url))
            {
                result.IsValid = false;
                result.Errors.Add("URL is required");
            }

            return Task.FromResult(result);
        }

        // DTOs
        public class HttpRequestConfig
        {
            public string Method { get; set; } = "GET";
            public string Url { get; set; } = string.Empty;
            public Dictionary<string, string>? Headers { get; set; }
            public object? Body { get; set; }
            public int? Timeout { get; set; }
            public int? Retries { get; set; }
            public string? SuccessEvaluator { get; set; }
            public Dictionary<string, string>? Outputs { get; set; }
        }
    }
}
