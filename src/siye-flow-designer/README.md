# SiyeFlow Designer - TypeScript Implementation

A standalone TypeScript-based workflow designer for SiyeFlow that uses C# models as the single source of truth.

## Architecture

- **Single Source of Truth**: All workflow models are defined in C# (`SiyeFlow.Core`)
- **TypeScript Generation**: Models are automatically generated from C# using `SiyeFlow.Core.TypeGen`
- **Class-Based Design**: TypeScript implementation follows C# patterns with classes and strong typing
- **Modular Structure**: Separated into core engine, visual designer, and UI components

## Project Structure

```
src/siye-flow-designer/
├── src/
│   ├── core/               # Core workflow engine (mirrors C# logic)
│   │   └── WorkflowEngine.ts
│   ├── designer/           # Visual designer components
│   │   ├── WorkflowDesigner.ts
│   │   ├── VisualModels.ts
│   │   ├── CanvasRenderer.ts
│   │   ├── PropertyPanel.ts
│   │   └── BlockPalette.ts
│   ├── models/             # Auto-generated from C#
│   │   └── workflow-models.ts
│   └── index.ts            # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Features

- Import/Export workflow JSON files
- Drag-and-drop block placement
- Visual connection drawing
- Property editing panel
- Workflow validation
- Strong typing with TypeScript
- Auto-generated models from C# source

## Development

### Prerequisites

- Node.js 18+
- .NET 8.0 SDK (for model generation)

### Setup

```bash
# Install dependencies
npm install

# Generate TypeScript models from C#
npm run type:generate

# Start development server
npm run dev
```

### Building

```bash
# Build for production
npm run build
```

## Model Generation

The TypeScript models are generated from the C# models in `SiyeFlow.Core`:

```bash
cd ../SiyeFlow.Core.TypeGen
dotnet run -- "../siye-flow-designer/src/models/workflow-models.ts"
```

This ensures that the TypeScript models always match the C# source of truth.

## Usage

```typescript
import { WorkflowDesigner } from './designer/WorkflowDesigner';

// Initialize the designer
const designer = new WorkflowDesigner('designer-container');

// The designer will handle all user interactions
```

## Integration

This designer can be:
- Used as a standalone web application
- Integrated into the SiyeFlow.UI .NET project
- Embedded in any web application
- Published as an npm package

## License

Part of the SiyeFlow project.
