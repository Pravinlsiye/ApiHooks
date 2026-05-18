# SiyeFlow.CLI

.NET command-line runner for workflow JSON produced by the SiyeFlow designer. Targets `net10.0`.

> CLI execution is partial — see [docs/PROGRESS.md](../../docs/PROGRESS.md). The browser executor in `siye-flow-designer` is the most complete runtime today.

## Build

```bash
cd src/SiyeFlow.CLI
dotnet build
```

## Commands

```bash
# Execute a saved workflow
dotnet run -- execute --workflow path/to/workflow.json

# Optional: pass an OpenAPI definition for richer validation
dotnet run -- execute --workflow workflow.json --api openapi.json

# Pass runtime inputs
dotnet run -- execute -w workflow.json --inputs '{"projectName":"My Project"}'

# Dry run — show what would happen
dotnet run -- execute -w workflow.json --dry-run

# Save execution output
dotnet run -- execute -w workflow.json --output results.json

# Validate structure
dotnet run -- validate --workflow workflow.json

# Generate docs from workflow JSON
dotnet run -- docs --workflow workflow.json --output ./out
```

Try one of the bundled samples from the designer:

```bash
dotnet run -- execute --workflow ../siye-flow-designer/samples/1-cat-fact.json
```

## Workflow shape

Workflows use the v2.0 node-edge schema — same shape as the designer. Full reference: [docs/WORKFLOW_SCHEMA.md](../../docs/WORKFLOW_SCHEMA.md). Source of truth: [`workflow-models.ts`](../siye-flow-designer/src/models/workflow-models.ts).

```json
{
  "id": "wf-1",
  "name": "Cat Fact",
  "version": "2.0.0",
  "nodes": [
    { "id": "start_1", "type": "start", "data": {} },
    {
      "id": "http_1",
      "type": "http-request",
      "data": {
        "method": "GET",
        "url": "https://catfact.ninja/fact",
        "outputs": { "catFact": "$.fact" }
      }
    },
    { "id": "end_1", "type": "end", "data": { "outputs": { "fact": "{{catFact}}" } } }
  ],
  "edges": [
    { "id": "e1", "type": "execution", "source": "start_1", "sourceHandle": "default", "target": "http_1", "targetHandle": "trigger" },
    { "id": "e2", "type": "execution", "source": "http_1", "sourceHandle": "success", "target": "end_1", "targetHandle": "trigger" }
  ]
}
```

## Variables

- `{{name}}` — string interpolation in URLs, headers, bodies, expressions.
- `{{a.b.c}}` — nested property access.
- `$.path.to.value` — JSONPath against an HTTP response, stored under an output key.

Loop blocks expose `loopIndex`, `loopItem`, and `loopCount` to their body.

## Dependencies

Listed in [`SiyeFlow.CLI.csproj`](SiyeFlow.CLI.csproj):

- `Microsoft.Extensions.DependencyInjection` 10.0.8
- `Microsoft.Extensions.Http` 10.0.8
- `Microsoft.Extensions.Logging.Console` 10.0.8
- `System.CommandLine` 2.0.0-beta4 (kept on beta until GA migration)
- `Microsoft.OpenApi.Readers` 1.6.29
- `Newtonsoft.Json` 13.0.4

## Architecture

```
SiyeFlow.CLI/
├── Program.cs                 # System.CommandLine entry point
├── Interfaces/                # IBlockExecutor, IWorkflowExecutor, ...
├── Services/                  # VariableStore, WorkflowExecutor, block executors
├── Models/                    # CLI-side DTOs
└── Utils/                     # Logging, JSON helpers
```

Part of the SiyeFlow project — see the [root README](../../README.md).
