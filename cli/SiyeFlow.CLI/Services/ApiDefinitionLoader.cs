using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Readers;
using SiyeFlow.CLI.Interfaces;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services
{
    /// <summary>
    /// Service for loading and parsing OpenAPI definitions
    /// </summary>
    public class ApiDefinitionLoader : IApiDefinitionLoader
    {
        private readonly ILogger<ApiDefinitionLoader> _logger;
        private readonly IConsoleWriter _console;

        public ApiDefinitionLoader(ILogger<ApiDefinitionLoader> logger, IConsoleWriter console)
        {
            _logger = logger;
            _console = console;
        }

        /// <inheritdoc />
        public async Task<OpenApiDocument> LoadAsync(string filePath)
        {
            try
            {
                _console.Info($"Loading OpenAPI definition from: {filePath}");

                if (!File.Exists(filePath))
                {
                    throw new FileNotFoundException($"OpenAPI file not found: {filePath}");
                }

                var fileContent = await File.ReadAllTextAsync(filePath);
                var reader = new OpenApiStringReader();
                var document = reader.Read(fileContent, out var diagnostic);

                if (diagnostic.Errors.Count > 0)
                {
                    foreach (var error in diagnostic.Errors)
                    {
                        _console.Error($"OpenAPI Error: {error.Message} at {error.Pointer}");
                        _logger.LogError("OpenAPI parsing error: {Message} at {Pointer}", error.Message, error.Pointer);
                    }
                }

                if (document == null)
                {
                    throw new InvalidOperationException("Failed to parse OpenAPI document");
                }

                _console.Success($"Successfully loaded OpenAPI document: {document.Info?.Title ?? "Untitled"}");
                _logger.LogInformation("Loaded OpenAPI document: {Title} v{Version}", 
                    document.Info?.Title ?? "Untitled", 
                    document.Info?.Version ?? "Unknown");

                return document;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load OpenAPI definition from {FilePath}", filePath);
                _console.Error($"Failed to load OpenAPI definition: {ex.Message}");
                throw;
            }
        }

        /// <inheritdoc />
        public bool Validate(OpenApiDocument document, out List<string> errors)
        {
            errors = new List<string>();

            if (document == null)
            {
                errors.Add("OpenAPI document is null");
                return false;
            }

            // Validate basic document structure
            if (document.Info == null)
            {
                errors.Add("OpenAPI document is missing 'info' section");
            }

            if (document.Paths == null || document.Paths.Count == 0)
            {
                errors.Add("OpenAPI document has no paths defined");
            }

            // Validate servers
            if (document.Servers == null || document.Servers.Count == 0)
            {
                errors.Add("OpenAPI document has no servers defined");
            }

            // Validate each path
            if (document.Paths != null)
            {
                foreach (var path in document.Paths)
                {
                    ValidatePath(path.Key, path.Value, errors);
                }
            }

            var isValid = errors.Count == 0;
            
            if (isValid)
            {
                _console.Success("OpenAPI document validation passed");
            }
            else
            {
                _console.Warning($"OpenAPI document validation found {errors.Count} issue(s)");
                foreach (var error in errors)
                {
                    _console.Warning($"  - {error}");
                }
            }

            return isValid;
        }

        private void ValidatePath(string path, OpenApiPathItem pathItem, List<string> errors)
        {
            var operations = new Dictionary<OperationType, OpenApiOperation?>
            {
                { OperationType.Get, pathItem.Operations.ContainsKey(OperationType.Get) ? pathItem.Operations[OperationType.Get] : null },
                { OperationType.Post, pathItem.Operations.ContainsKey(OperationType.Post) ? pathItem.Operations[OperationType.Post] : null },
                { OperationType.Put, pathItem.Operations.ContainsKey(OperationType.Put) ? pathItem.Operations[OperationType.Put] : null },
                { OperationType.Delete, pathItem.Operations.ContainsKey(OperationType.Delete) ? pathItem.Operations[OperationType.Delete] : null },
                { OperationType.Patch, pathItem.Operations.ContainsKey(OperationType.Patch) ? pathItem.Operations[OperationType.Patch] : null }
            };

            foreach (var operation in operations.Where(op => op.Value != null))
            {
                if (string.IsNullOrWhiteSpace(operation.Value!.OperationId))
                {
                    errors.Add($"Operation {operation.Key} on path {path} is missing operationId");
                }
            }
        }
    }
}
