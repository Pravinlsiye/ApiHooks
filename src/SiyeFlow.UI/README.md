# SiyeFlow.UI

ASP.NET Core middleware that embeds the SiyeFlow workflow designer in any web API, the same way Swagger UI is embedded. Targets `net10.0`.

## Install

```csharp
// Program.cs
using SiyeFlow.UI;

builder.Services.AddSiyeFlowDesigner(options =>
{
    options.RoutePrefix    = "workflows";              // serves at /workflows
    options.DocumentTitle  = "My API Workflow Designer";
    options.Theme          = "dark";                    // "light" | "dark" | "system"
});

app.UseSiyeFlowDesigner();
```

The designer mounts at `/{RoutePrefix}` and serves these embedded routes:

| Path | Asset |
| --- | --- |
| `/workflows/` | redirects to `index.html` |
| `/workflows/index.html` | template rendered by `SiyeFlowMiddleware` with `{{RoutePrefix}}`, `{{DocumentTitle}}`, `{{Theme}}`, `{{CustomCss}}` |
| `/workflows/siye-flow-designer.umd.js` | designer bundle |
| `/workflows/style.css` | theme + layout |

The middleware also injects a `window.SiyeFlowConfig` object so the designer can self-bootstrap and auto-load the host API's `swagger/v1/swagger.json`.

## Configuration

See [`SiyeFlowOptions.cs`](SiyeFlowOptions.cs). Common settings:

```csharp
options.RoutePrefix             = "workflows";
options.DocumentTitle           = "My Workflows";
options.Theme                   = "dark";
options.EnableEditor            = true;
options.ShowSamples             = true;
options.EnableRealTimeMonitoring = false;
options.CustomCss               = ":root { --accent-primary: #111; }";
```

## Embed pipeline

```mermaid
flowchart LR
    src[src/siye-flow-designer/src] -->|npm run build| dist[dist/]
    dist -->|build-designer.ps1| UIfolder[src/SiyeFlow.UI/UI/]
    UIfolder -->|EmbeddedResource| dll[SiyeFlow.UI.dll]
    dll -->|StaticFileMiddleware| browser[/workflows/*]
```

- [`build-designer.ps1`](build-designer.ps1) runs as `Target Name="BuildDesigner" BeforeTargets="PrepareForBuild"` in [`SiyeFlow.UI.csproj`](SiyeFlow.UI.csproj). It calls `npm run build` in the sibling designer project and copies `dist/*` into [`UI/`](UI), preserving [`UI/index.html`](UI/index.html) (the template).
- The csproj declares each `UI/*` file as `EmbeddedResource`, so they ship inside `SiyeFlow.UI.dll`.
- At runtime [`SiyeFlowMiddleware.cs`](SiyeFlowMiddleware.cs) serves them via `StaticFileMiddleware` with an `EmbeddedFileProvider`.

If you skip the .NET build (e.g. iterating on TS), keep `UI/` in sync manually:

```powershell
cd src/siye-flow-designer
npm run build
Copy-Item dist\* ..\SiyeFlow.UI\UI -Force
```

## What's included

- Designer-only mode (`AddSiyeFlowDesigner`) — visual design, breakpoints, in-browser execution.
- Backed by the `siye-flow-designer` bundle; no server-side execution endpoints, no SignalR hub.
- Loads the host API's `swagger/v1/swagger.json` automatically so endpoints appear in the palette.

## Browser compatibility

Chromium, Firefox, Safari. Pointer events and touch are supported.

Part of the SiyeFlow project — see the [root README](../../README.md).
