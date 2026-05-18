# SiyeFlow Progress

**Last Updated**: 2026-05-18

Single source of truth for what's done, what's in flight, and what's queued. The browser executor in [`siye-flow-designer`](../src/siye-flow-designer) is the most complete runtime; the .NET CLI runner is partial.

## Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Designer UI | Complete | Pointer + hand canvas, Ctrl+wheel zoom, monochrome theme, palette, terminal |
| Browser executor | Complete | All block executors implemented except Sub-Workflow (stub) |
| Debugging | Complete | Breakpoints, pause/resume/step, variable inspector |
| Schema | Complete | v2.0 node-edge; defined in `models/workflow-models.ts` |
| .NET embed pipeline | Complete | `build-designer.ps1` + `EmbeddedResource` |
| CLI execution | In progress | ~50%; some block executors still TODO |
| Sub-Workflow runtime | Planned | Stub today |

## Block executors

| Block | Browser (designer) | CLI |
| --- | --- | --- |
| Start | ✅ | ✅ |
| End | ✅ | ✅ |
| HTTP Request | ✅ | ✅ |
| Variable | ✅ | ✅ |
| Condition | ✅ | ✅ |
| Log | ✅ | ✅ |
| Delay | ✅ | ✅ |
| Evaluate | ✅ | ✅ |
| Loop | ✅ | ⏳ |
| Switch | ✅ | ⏳ |
| Batch | ✅ | ⏳ |
| Sub-Workflow | ⏳ stub | ⏳ stub |
| Webhook Trigger | not in palette | not implemented |

Legend: ✅ complete · ⏳ in progress / stub.

## Recent (2026-05)

### Theme + canvas UX
- Re-themed the entire designer to a monochrome palette (white / off-white / grey) in [`theme.css`](../src/siye-flow-designer/src/surface/styles/theme.css). All hue-based tokens replaced with neutrals + dedicated `--connection-*`, `--execution-*`, `--breakpoint-*`, `--log-*` variables.
- Canvas converted to pointer events (touch / stylus friendly).
- Hand vs Pointer tool toggle (`H` / `V`) plus middle-mouse pan.
- Ctrl/Cmd + wheel zoom with `touch-action: none` on canvas + blocks.
- Escape cancels an in-progress wire; duplicate edges are dropped on connect.

### Repo hygiene
- Removed stale hashed JS chunks from [`src/SiyeFlow.UI/UI/`](../src/SiyeFlow.UI/UI) (left over from an older Vite config; current build only emits `siye-flow-designer.{es,umd}.js` + `style.css`).
- Dropped redundant `Microsoft.AspNetCore.SignalR` PackageReference from `SiyeFlow.UI.csproj` (NU1510 — covered by `Microsoft.AspNetCore.App` framework reference on net10).
- Dropped unused `Microsoft.AspNetCore.OpenApi` from the demo (Swashbuckle handles Swagger).
- Bumped `Newtonsoft.Json` to 13.0.4 across all C# projects.
- CLI deps aligned to net10 (`Microsoft.Extensions.*` 10.0.8, `Microsoft.OpenApi.Readers` 1.6.29).
- Designer deps bumped within current majors (`vitest` 4.1, `@types/node` 20.19).
- `.gitignore` cleaned (removed stale `cli/SiyeFlow.CLI/docs/` entry).

## Future

### Designer UX
| Feature | Priority | Notes |
| --- | --- | --- |
| Property panel | High | Side panel/modal to edit all block data |
| Undo / redo | High | Ctrl+Z/Y for moves, connections, deletions |
| Block search | Medium | Ctrl+F across blocks |
| Auto-layout | Medium | dagre/elkjs one-click arrange |
| Connection labels | Medium | Port names visible on wires |
| Multi-select | Low | Box-select + bulk move/delete |
| Connection waypoints | Low | Drawflow-style reroute handles |

### Execution / debugging
| Feature | Priority | Notes |
| --- | --- | --- |
| Sub-Workflow executor | High | Replace the current stub |
| Execution history | High | Past runs with timing + variable snapshots |
| Conditional breakpoints | Medium | Break when expression true |
| Watch expressions | Medium | Custom expressions per pause |
| Execution profiler | Medium | Per-block timing chart |
| Export logs | Medium | Download terminal + variables as JSON |
| Mock HTTP responses | Low | Run without real APIs |

### Integration
| Feature | Priority | Notes |
| --- | --- | --- |
| CLI parity with browser executor | Medium | Finish Loop / Switch / Batch in CLI |
| Workflow versioning | Medium | Diff between saved versions |
| Read-only embed mode | Medium | For docs / sharing |
| OpenAPI catalog | Low | Import endpoints from any spec into HTTP blocks |

### Dependency migrations (deferred)
- `System.CommandLine` beta4 → 2.0 GA (`Action`-based API change)
- `Swashbuckle.AspNetCore` 6 → 10 (Microsoft.OpenApi 2.x rewrite)
- `vite` 5 → 8 (will close current `esbuild` advisory)
- `typescript` 5.9 → 6, `@types/node` 20 → 25
- `Microsoft.TypeScript.MSBuild` 5 → 6, `TypeGen` 5 → 7

These need real migration work, so they're not part of the routine "up-to-date" sweep.

## Legend

✅ Complete · ⏳ In progress / stub · 📋 Planned · 🔴 High · 🟡 Medium · 🟢 Low
