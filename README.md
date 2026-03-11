# SiyeFlow - API Workflow Automation

A visual workflow designer and execution engine for orchestrating API calls. Build, debug, and run multi-step API workflows in the browser or from the command line.

## What's Included

### SiyeFlow Designer (TypeScript)
A standalone browser-based workflow designer with a built-in execution engine.

```bash
cd src/siye-flow-designer
npm install
npm run dev
# Open http://localhost:3001
```

Features:
- Drag-and-drop block canvas with SVG connections
- 10 block types: Start, End, HTTP Request, Variable, Condition, Log, Delay, Evaluate, Loop, Sub-Workflow
- Import/Export workflow JSON files
- In-browser workflow execution with real HTTP calls
- Breakpoints and step-through debugging
- Variable Inspector with tabbed JSON tree view (pin, detach, minimize)
- Block detail view with runtime variable resolution
- Dark/Light/System theme support
- 6 sample workflows using public APIs

### SiyeFlow.CLI (.NET)
Execute workflows from the command line.

```bash
cd src/SiyeFlow.CLI
dotnet run -- execute --workflow ../../demo/api1/Workflows/test-catfact.json
```

### SiyeFlow.UI (ASP.NET Middleware)
Embed the workflow designer in any ASP.NET Core API.

```csharp
builder.Services.AddSiyeFlow();
app.UseSiyeFlow();
// Navigate to /siyeflow
```

## Workflow Schema (v2.0)

Workflows use a node-edge graph with typed blocks and execution/data edges:

```json
{
  "id": "sample-cat-fact",
  "name": "Cat Fact API",
  "version": "2.0.0",
  "nodes": [
    {
      "id": "start_1",
      "type": "start",
      "label": "Start",
      "data": {}
    },
    {
      "id": "http_1",
      "type": "http-request",
      "label": "Get Cat Fact",
      "data": {
        "method": "GET",
        "url": "https://catfact.ninja/fact",
        "outputs": { "catFact": "$.fact" }
      }
    },
    {
      "id": "end_1",
      "type": "end",
      "label": "End",
      "data": { "outputs": { "fact": "{{catFact}}" } }
    }
  ],
  "edges": [
    { "id": "e1", "type": "execution", "source": "start_1", "sourceHandle": "default", "target": "http_1", "targetHandle": "trigger" },
    { "id": "e2", "type": "execution", "source": "http_1", "sourceHandle": "success", "target": "end_1", "targetHandle": "trigger" }
  ]
}
```

Key concepts:
- **Nodes**: Workflow blocks with type-specific `data` configuration
- **Edges**: Execution flow (`success`/`fail` branching) and data connections
- **JSONPath extraction**: `$.field` syntax to extract values from HTTP responses
- **Variable interpolation**: `{{variableName}}` in URLs, headers, bodies, expressions

## Debugging

The designer includes a full debugging toolkit:

- **Breakpoints**: Click the red dot on any block's left edge to set a breakpoint
- **Pause/Resume/Step**: Space to pause/resume, S to step one block at a time
- **Block Highlighting**: Blue = executing, Green = success, Red = failed
- **Variable Inspector**: Tabbed panel showing all variables and block outputs as a JSON tree
  - Pin tabs to persist across executions
  - Detach tabs into floating windows
  - Minimize to title bar
- **Runtime Resolution**: Block detail rows show resolved `{{variable}}` values at breakpoints
- **Copy JSON**: Click the copy button on any detail row to copy resolved data

## Project Structure

```
SiyeFlow/
├── src/
│   ├── siye-flow-designer/    # TypeScript workflow designer + execution engine
│   │   ├── src/
│   │   │   ├── canvas/        # Canvas rendering (HTML blocks + SVG connections)
│   │   │   ├── components/    # UI components (palette, toolbar, inspector, terminal)
│   │   │   ├── core/          # Workflow engine + browser executor
│   │   │   ├── models/        # TypeScript type definitions
│   │   │   ├── renderers/     # Block and connection renderers
│   │   │   ├── styles/        # CSS with theme variables
│   │   │   └── utils/         # DOM helpers, animation, state management
│   │   └── samples/           # 6 sample workflow JSON files
│   ├── SiyeFlow.CLI/          # .NET command-line executor
│   ├── SiyeFlow.Core/         # Shared models and interfaces
│   └── SiyeFlow.UI/           # ASP.NET Core middleware
├── demo/api1/Workflows/       # Test workflow files for CLI
└── docs/
    ├── WORKFLOW_SCHEMA.md      # Schema reference
    └── PROGRESS.md             # Implementation status and roadmap
```

## Block Types

| Block | Description | Ports |
|-------|-------------|-------|
| **Start** | Entry point, defines input variables | out |
| **End** | Exit point, returns outputs | trigger |
| **HTTP Request** | Makes REST API calls (GET/POST/PUT/DELETE) | trigger, success, fail |
| **Variable** | Sets variables for downstream blocks | trigger, out |
| **Condition** | Branches on expression (true/false) | trigger, success, fail |
| **Log** | Logs messages to terminal | trigger, out |
| **Delay** | Pauses execution (ms/seconds/minutes) | trigger, out |
| **Evaluate** | Evaluates expressions, stores result | trigger, out |
| **Loop** | Iterates over arrays, executes body per item | trigger, each, done |
| **Sub-Workflow** | Nested workflow execution (stub) | trigger, success, fail |

## Sample Workflows

Import these from `src/siye-flow-designer/samples/`:

1. **Cat Fact** - Simple GET request with JSONPath extraction
2. **Users & Posts** - Chained API calls with variable passing
3. **Status Check** - Condition branching on HTTP status
4. **Chained APIs** - Multiple public APIs (Dog, Joke, Countries) combined
5. **Loop Users** - Fetch users and iterate with Loop block
6. **Evaluate + Delay** - Expression evaluation, delay, and branching

## Development

```bash
# Designer (TypeScript + Vite)
cd src/siye-flow-designer
npm install
npm run dev          # Dev server on port 3001
npm run build        # Production build
npm test             # Run tests

# CLI (.NET)
cd src/SiyeFlow.CLI
dotnet run -- execute --workflow path/to/workflow.json
```

---

Built with ❤️ for API automation enthusiasts
