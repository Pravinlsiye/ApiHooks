# SiyeFlow Progress

**Last Updated**: 2026-03-11

## Task Status

| Task Name | Status | Priority | Description |
|-----------|--------|----------|-------------|
| **New Schema Design** | 📋 Planned | 🔴 High | Design new workflow schema without backward compatibility constraints - clean slate approach |
| **Complete Remaining Blocks** | ⏳ In Progress | 🟡 Medium | Implement executor for: Sub-Workflow |
| **Start Block Executor** | ✅ Complete | - | Start block executor implementation |
| **End Block Executor** | ✅ Complete | - | End block executor implementation |
| **HTTP Request Block Executor** | ✅ Complete | - | HTTP Request block executor with API call support |
| **Variable Block Executor** | ✅ Complete | - | Variable block executor for set/get/delete operations |
| **Condition Block Executor** | ✅ Complete | - | Condition block executor with branching logic |
| **Log Block Executor** | ✅ Complete | - | Log executor for console output with level support |
| **Delay Block Executor** | ✅ Complete | - | Delay executor with abort support, seconds/minutes |
| **Evaluate Block Executor** | ✅ Complete | - | Evaluate executor for expression evaluation |
| **Loop Block Executor** | ✅ Complete | - | Loop executor iterates body blocks, sets loopIndex/loopItem/loopCount |
| **Sub-Workflow Block Executor** | ⏳ Stub | 🔴 High | Sub-Workflow executor - logs "not yet implemented" |
| **TypeScript Designer** | ✅ Complete | - | Complete TypeScript workflow designer UI |
| **.NET Integration** | ✅ Complete | - | Integration with .NET CLI and UI |
| **Core Models** | ✅ Complete | - | Core workflow models and schema definitions |
| **CLI Execution** | ⏳ In Progress | 🟡 Medium | CLI execution engine (~50% complete) |

## Block Implementation Status

**Overall Progress**: 9/10 executors complete (90%) ██████████████████░░

### ✅ Complete Blocks (9)
- Start
- End
- HTTP Request
- Variable
- Condition
- Log
- Delay
- Evaluate
- Loop

### ⏳ Remaining Blocks (1)
- Sub-Workflow (🔴 High Priority - stub, not yet implemented)

## Component Status

| Component | Status | Progress | Notes |
|-----------|--------|----------|-------|
| TypeScript Designer | ✅ Complete | 100% | Full UI implementation |
| .NET Integration | ✅ Complete | 100% | Build scripts and integration |
| Core Models | ✅ Complete | 100% | Schema definitions in TypeScript |
| CLI Execution | ⏳ In Progress | ~50% | Port-based execution engine |
| Rendering | ✅ Complete | 100% | HTML blocks + SVG connections |
| Debugging | ✅ Complete | 100% | Breakpoints, pause/step, inspector, variable resolution |
| Block Details | ✅ Complete | 100% | Data rows, runtime resolution, copy to clipboard |

## Priority Summary

- 🔴 **High Priority**: 2 tasks
  - New Schema Design
  - Sub-Workflow Block Executor

- 🟡 **Medium Priority**: 2 tasks
  - Complete Remaining Blocks
  - CLI Execution

## Recent Updates (2026-03-10)

### Debugging & Inspector
- ✅ Breakpoints on blocks (click red dot on left edge to toggle)
- ✅ Pause/Resume/Step execution controls with toolbar buttons and keyboard shortcuts
- ✅ Block highlighting during execution (blue=executing, green=success, red=fail)
- ✅ Variable Inspector - tabbed floating panel with JSON tree view
  - Tabs per breakpoint/step with block name
  - Pin tabs to persist across executions (with timestamp label)
  - Detach tabs into separate floating windows, re-attach back
  - Minimize/restore inspector panel (minimized by default)
  - Scroll arrows for tab overflow (Notepad++ style)
  - Settings toggle: always show inspector vs breakpoints only

### Block Details View
- ✅ Read-only data detail rows on each block showing values, outputs, headers
- ✅ Runtime variable resolution: `{{variable}}` and JSONPath outputs show actual values at breakpoints (green text)
- ✅ Resolved values on hover tooltip (full JSON with actual values)
- ✅ Copy button on each detail row (copies resolved JSON to clipboard)

### Samples
- ✅ 6 sample workflow JSON files using public APIs
- ✅ Covers all 10 implemented block types: Start, End, HTTP, Variable, Log, Condition, Loop, Evaluate, Delay, Switch
- ✅ Demonstrates: GET requests, chaining, condition branching, variable interpolation, loops, expression evaluation, delays

### Cleanup
- Removed legacy `siye-flow-designer-old/` directory (fully superseded by v2.0.0)
- Corrected executor statuses: Log, Delay, Evaluate were already implemented
- Removed non-existent Try/Catch and Collect from tracker (not in current schema)

### Schema Management
- Schema is managed in TypeScript (`src/siye-flow-designer/src/models/workflow-models.ts`)
- Planning new schema design without backward compatibility constraints

## Future Plans

### Browser-Based Workflow Execution Engine 🚀

**Status**: 📋 Planned | **Estimated Timeline**: 2-3 months | **Priority**: 🟡 Medium

A browser-based workflow execution engine that can run workflow JSON files directly in the browser.

#### Phase 1: MVP (2-3 weeks)
- ✅ Core execution engine with port-based flow logic
- ✅ Variable store and execution context
- ✅ Block executors: Start, HTTP Request, Variable, Condition, End
- ✅ JSONPath evaluation for data extraction
- ✅ Variable interpolation (`{{variable}}`)
- ✅ Basic error handling

#### Phase 2: Advanced Blocks (1-2 weeks)
- ✅ Loop executor with iteration tracking (iterates body, sets loopIndex/loopItem)
- ✅ Delay executor with abort support
- ✅ Log executor with level support
- ✅ Evaluate executor for expression evaluation
- ✅ Pause/Resume/Step execution controls
- ✅ Block highlighting during execution (executing/success/fail states)

#### Phase 3: UI Integration (1-2 weeks)
- ✅ Execution visualizer (block highlighting: executing/success/fail)
- ✅ Variable inspector (tabbed panel with JSON tree, pin, detach, minimize)
- ✅ Log viewer (terminal panel with execution logs)
- ✅ Block details view (data rows, runtime resolution, copy JSON)
- ⏳ Property panel for editing block data (side panel or modal)

#### Phase 4: Advanced Features (1-2 weeks)
- ✅ Pause/Resume execution
- ✅ Breakpoints for debugging
- ⏳ Execution profiling (timing per block, bottleneck detection)
- ⏳ Export execution logs (download as JSON/CSV)
- ⏳ Web Worker support for long-running workflows

## Feature Suggestions

### Designer UX
| Feature | Priority | Description |
|---------|----------|-------------|
| **Property Panel** | 🔴 High | Side panel or modal to edit all block data (values, outputs, headers, expressions) - not just the 1-2 fields shown inline |
| **Undo/Redo** | 🔴 High | Ctrl+Z/Ctrl+Y for block moves, connections, deletions |
| **Block Search** | 🟡 Medium | Ctrl+F to search blocks by name, type, or data content |
| **Auto-layout** | 🟡 Medium | One-click layout algorithm (dagre/elkjs) to arrange blocks neatly |
| **Connection Labels** | 🟡 Medium | Show port name labels on connection lines |
| **Keyboard Navigation** | 🟡 Medium | Arrow keys to move between blocks, Enter to open properties |
| **Block Templates** | 🟢 Low | Save a group of blocks as a reusable template |
| **Multi-select** | 🟢 Low | Shift+click or box-select to move/delete multiple blocks |

### Execution & Debugging
| Feature | Priority | Description |
|---------|----------|-------------|
| **Execution History** | 🔴 High | Log of past runs with timing, status, and variable snapshots - click to replay |
| **Watch Expressions** | 🟡 Medium | Custom expressions evaluated at each breakpoint (like IDE watch window) |
| **Conditional Breakpoints** | 🟡 Medium | Break only when a condition is true (e.g. `statusCode != 200`) |
| **Execution Profiler** | 🟡 Medium | Flame chart / timing bars showing how long each block took |
| **Export Logs** | 🟡 Medium | Download terminal output and variable snapshots as JSON |
| **Mock HTTP Responses** | 🟢 Low | Intercept HTTP blocks with mock data for testing without real APIs |

### Integration
| Feature | Priority | Description |
|---------|----------|-------------|
| **Sub-Workflow Executor** | 🔴 High | Load and execute nested workflow definitions inline |
| **Workflow Versioning** | 🟡 Medium | Track changes to workflow JSON, diff between versions |
| **Embed Mode** | 🟡 Medium | Embeddable read-only viewer for documentation/sharing |
| **REST API Catalog** | 🟢 Low | Browse and import endpoints from OpenAPI specs directly into HTTP blocks |

## Notes

- **Status Legend**: ✅ Complete | ⏳ In Progress | 📋 Planned | 🔴 High Priority | 🟡 Medium Priority | 🟢 Low Priority
- **Schema Changes**: New schema design will not maintain backward compatibility - clean break from legacy structure
- **Rendering**: HTML blocks + SVG connections (current architecture)
