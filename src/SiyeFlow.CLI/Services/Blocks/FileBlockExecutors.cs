using Microsoft.Extensions.Logging;
using SiyeFlow.CLI.Interfaces;
using SiyeFlow.Core.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace SiyeFlow.CLI.Services.Blocks
{
    /// <summary>
    /// Downloads a file from a URL and stores its contents in a variable.
    /// Binary files are stored as base64 data URIs; text/* files are stored as plain strings.
    /// If SaveAs is true and a FileName is specified the file is written to disk.
    /// </summary>
    public class FileDownloadBlockExecutor : BlockExecutorBase
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public FileDownloadBlockExecutor(
            ILogger<FileDownloadBlockExecutor> logger,
            IVariableStore variableStore,
            IConsoleWriter console,
            IHttpClientFactory httpClientFactory)
            : base(logger, variableStore, console)
        {
            _httpClientFactory = httpClientFactory;
        }

        public override BlockType BlockType => BlockType.FileDownload;

        protected override async Task<BlockExecutionResult> ExecuteInternalAsync(
            Node node, Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            var config  = GetConfig<FileDownloadConfig>(node);
            var url      = _variableStore.ReplaceVariables(config.Url ?? "");
            var outVar   = string.IsNullOrEmpty(config.OutputVar) ? "fileData" : config.OutputVar;
            var encoding = (config.Encoding ?? "auto").ToLowerInvariant();
            var saveAs   = config.SaveAs;
            var fileName = _variableStore.ReplaceVariables(
                !string.IsNullOrEmpty(config.FileName) ? config.FileName
                    : (url.Contains('/') ? url.Split('/').Last() : "download"));

            if (string.IsNullOrEmpty(url))
                return Fail("No URL specified");

            _console.Info($"Downloading {url}");

            var client   = _httpClientFactory.CreateClient();
            var response = await client.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
                return Fail($"HTTP {(int)response.StatusCode} {response.ReasonPhrase}",
                    new Dictionary<string, object> { ["statusCode"] = (int)response.StatusCode });

            var mimeType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";
            var bytes    = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            var size     = bytes.Length;

            var useText = encoding == "text" ||
                          (encoding == "auto" && mimeType.StartsWith("text/", StringComparison.OrdinalIgnoreCase));

            string fileData;
            if (useText)
            {
                fileData = Encoding.UTF8.GetString(bytes);
            }
            else
            {
                fileData = $"data:{mimeType};base64,{Convert.ToBase64String(bytes)}";
            }

            _variableStore.SetVariable(outVar, fileData);
            _variableStore.SetVariable("fileName", fileName);
            _variableStore.SetVariable("mimeType", mimeType);
            _variableStore.SetVariable("fileSize", size);

            if (saveAs && !string.IsNullOrEmpty(fileName))
            {
                await File.WriteAllBytesAsync(fileName, bytes, cancellationToken);
                _console.Success($"Saved to disk: {fileName}");
            }

            _console.Info($"Downloaded {fileName} ({size / 1024.0:F1} KB, {mimeType})");

            return new BlockExecutionResult
            {
                Success = true,
                NextHandle = "success",
                Outputs = new Dictionary<string, object>
                {
                    [outVar] = fileData,
                    ["fileName"] = fileName,
                    ["mimeType"] = mimeType,
                    ["fileSize"] = size
                }
            };
        }

        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
            => Task.FromResult(new ValidationResult { IsValid = true });

        private static BlockExecutionResult Fail(string error, Dictionary<string, object>? outputs = null)
            => new() { Success = false, Error = error, NextHandle = "fail", Outputs = outputs ?? new() };

        private class FileDownloadConfig
        {
            public string? Url       { get; set; }
            public string? OutputVar { get; set; }
            public string? Encoding  { get; set; }
            public bool    SaveAs    { get; set; }
            public string? FileName  { get; set; }
        }
    }

    /// <summary>
    /// Reads a file from disk and stores its contents in a variable.
    /// Replaces the browser file-picker; in the CLI the path comes from the filePath field.
    /// </summary>
    public class FileUploadBlockExecutor : BlockExecutorBase
    {
        public FileUploadBlockExecutor(ILogger<FileUploadBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console)
            : base(logger, variableStore, console) { }

        public override BlockType BlockType => BlockType.FileUpload;

        protected override async Task<BlockExecutionResult> ExecuteInternalAsync(
            Node node, Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            var config   = GetConfig<FileUploadConfig>(node);
            var filePath = _variableStore.ReplaceVariables(config.FilePath ?? "");
            var outVar   = string.IsNullOrEmpty(config.OutputVar) ? "uploadedFile" : config.OutputVar;
            var encoding = (config.Encoding ?? "auto").ToLowerInvariant();

            if (string.IsNullOrEmpty(filePath))
                return Fail("No filePath specified. In the CLI executor set 'filePath' in the FileUpload block data.");

            if (!File.Exists(filePath))
                return Fail($"File not found: {filePath}");

            var fileName = Path.GetFileName(filePath);
            var bytes    = await File.ReadAllBytesAsync(filePath, cancellationToken);
            var size     = bytes.Length;
            var ext      = Path.GetExtension(filePath).ToLowerInvariant();

            var textExtensions = new HashSet<string> { ".txt", ".csv", ".json", ".xml", ".yaml", ".yml", ".md", ".html", ".htm", ".js", ".ts", ".cs" };
            var useText = encoding == "text" ||
                          (encoding == "auto" && textExtensions.Contains(ext));

            string fileData;
            if (useText)
            {
                fileData = Encoding.UTF8.GetString(bytes);
            }
            else
            {
                var mimeType = "application/octet-stream";
                fileData = $"data:{mimeType};base64,{Convert.ToBase64String(bytes)}";
            }

            _variableStore.SetVariable(outVar, fileData);
            _variableStore.SetVariable("fileName", fileName);
            _variableStore.SetVariable("fileSize", size);

            _console.Info($"Read {fileName} ({size / 1024.0:F1} KB)");

            return new BlockExecutionResult
            {
                Success = true,
                NextHandle = "success",
                Outputs = new Dictionary<string, object>
                {
                    [outVar]       = fileData,
                    ["fileName"]   = fileName,
                    ["fileSize"]   = size
                }
            };
        }

        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
            => Task.FromResult(new ValidationResult { IsValid = true });

        private static BlockExecutionResult Fail(string error)
            => new() { Success = false, Error = error, NextHandle = "fail" };

        private class FileUploadConfig
        {
            public string? FilePath  { get; set; }
            public string? OutputVar { get; set; }
            public string? Encoding  { get; set; }
        }
    }

    /// <summary>
    /// Appends a value to a named string variable (stream accumulator).
    /// Designed to run inside a Loop body to build up a file line by line.
    /// </summary>
    public class FileStreamWriterBlockExecutor : BlockExecutorBase
    {
        public FileStreamWriterBlockExecutor(ILogger<FileStreamWriterBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console)
            : base(logger, variableStore, console) { }

        public override BlockType BlockType => BlockType.FileStreamWriter;

        protected override Task<BlockExecutionResult> ExecuteInternalAsync(
            Node node, Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            var config    = GetConfig<FileStreamWriterConfig>(node);
            var streamVar = string.IsNullOrEmpty(config.StreamVar) ? "stream" : config.StreamVar;
            var value     = _variableStore.ReplaceVariables(config.Value ?? "");
            var sepRaw    = config.Separator ?? "\\n";
            var sep       = sepRaw.Replace("\\n", "\n").Replace("\\t", "\t");

            var existing     = _variableStore.GetVariable(streamVar) as string ?? "";
            var accumulated  = existing.Length > 0 ? existing + sep + value : value;

            _variableStore.SetVariable(streamVar, accumulated);

            _logger.LogDebug("StreamWriter: appended {Len} chars to '{Var}'", value.Length, streamVar);

            return Task.FromResult(new BlockExecutionResult
            {
                Success = true,
                NextHandle = "out",
                Outputs = new Dictionary<string, object> { [streamVar] = accumulated }
            });
        }

        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
            => Task.FromResult(new ValidationResult { IsValid = true });

        private class FileStreamWriterConfig
        {
            public string? StreamVar  { get; set; }
            public string? Value      { get; set; }
            public string? Separator  { get; set; }
        }
    }

    /// <summary>
    /// Reads a string variable and iterates over it in chunks (lines / chars).
    /// Exposes chunk, chunkIndex, chunkCount, totalLines.
    /// Supports skip (skip first N lines) and limit (max chunks, 0 = all).
    /// </summary>
    public class FileStreamReaderBlockExecutor : BlockExecutorBase
    {
        public FileStreamReaderBlockExecutor(ILogger<FileStreamReaderBlockExecutor> logger, IVariableStore variableStore, IConsoleWriter console)
            : base(logger, variableStore, console) { }

        public override BlockType BlockType => BlockType.FileStreamReader;

        protected override Task<BlockExecutionResult> ExecuteInternalAsync(
            Node node, Dictionary<string, object>? inputs,
            Interfaces.ExecutionContext context, CancellationToken cancellationToken)
        {
            var config     = GetConfig<FileStreamReaderConfig>(node);
            var sourceName = _variableStore.ReplaceVariables(config.Source ?? "");
            var mode       = (config.Mode ?? "lines").ToLowerInvariant();
            var chunkSize  = Math.Max(1, config.ChunkSize);
            var skip       = Math.Max(0, config.Skip);
            var limit      = Math.Max(0, config.Limit);
            var outputVar  = string.IsNullOrEmpty(config.OutputVar) ? "chunk" : config.OutputVar;

            var source = (_variableStore.GetVariable(sourceName) as string) ?? sourceName;

            List<string> chunks;
            int totalLines;

            if (mode == "lines")
            {
                var lines = source.Split('\n').ToList();
                totalLines = lines.Count - skip;
                if (skip > 0) lines = lines.Skip(skip).ToList();
                if (limit > 0) lines = lines.Take(limit * chunkSize).ToList();

                if (chunkSize == 1)
                {
                    chunks = lines;
                }
                else
                {
                    chunks = new List<string>();
                    for (var i = 0; i < lines.Count; i += chunkSize)
                        chunks.Add(string.Join("\n", lines.Skip(i).Take(chunkSize)));
                }
            }
            else
            {
                totalLines = source.Length;
                var start = skip * chunkSize;
                var end   = limit > 0 ? start + limit * chunkSize : source.Length;
                chunks = new List<string>();
                for (var i = start; i < Math.Min(end, source.Length); i += chunkSize)
                    chunks.Add(source.Substring(i, Math.Min(chunkSize, source.Length - i)));
            }

            var chunkCount = chunks.Count;
            _console.Info($"Stream Reader: {chunkCount} chunks (mode={mode}, chunkSize={chunkSize}{(skip > 0 ? $", skip={skip}" : "")}{(limit > 0 ? $", limit={limit}" : "")})");

            _variableStore.SetVariable("chunkCount", chunkCount);
            _variableStore.SetVariable("totalLines", totalLines);

            // Store chunks on context so WorkflowExecutor can iterate
            context.Variables["__streamReaderChunks__"] = chunks;
            context.Variables["__streamReaderOutputVar__"] = outputVar;
            context.Variables["__streamReaderNodeId__"] = node.Id;

            return Task.FromResult(new BlockExecutionResult
            {
                Success = true,
                NextHandle = "each",
                Outputs = new Dictionary<string, object>
                {
                    ["chunkCount"] = chunkCount,
                    ["totalLines"] = totalLines,
                    ["chunks"]     = chunks,
                    ["outputVar"]  = outputVar
                }
            });
        }

        public override Task<ValidationResult> ValidateAsync(Node node, Interfaces.ExecutionContext context)
            => Task.FromResult(new ValidationResult { IsValid = true });

        private class FileStreamReaderConfig
        {
            public string? Source    { get; set; }
            public string? Mode      { get; set; }
            public int     ChunkSize { get; set; } = 1;
            public int     Skip      { get; set; } = 0;
            public int     Limit     { get; set; } = 0;
            public string? OutputVar { get; set; }
        }
    }
}
