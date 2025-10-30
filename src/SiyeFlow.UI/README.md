# SiyeFlow.UI - Visual Workflow Designer

A lightweight, embeddable visual workflow designer for ASP.NET Core applications. Design API workflows visually without execution capabilities.

## Features

✨ **Visual Design Only** - No execution code, just pure visual workflow design
📦 **Embeddable** - Works like Swagger UI, embedded directly in your API
🎨 **Dark Theme** - Professional dark-themed interface
🔌 **Drag & Drop** - Intuitive drag-and-drop workflow creation
🔀 **Multiple Paths** - Support for success/failure branching
📥 **Import/Export** - Load existing workflows and save new ones

## Installation

### For Design-Only Mode (Recommended)

```csharp
// In Program.cs or Startup.cs
builder.Services.AddSiyeFlowDesigner(options =>
{
    options.RoutePrefix = "workflows";  // Access at /workflows
    options.DocumentTitle = "My API Workflow Designer";
});

// In the Configure method
app.UseSiyeFlowDesigner();
```

### For Full Mode (Includes Execution - Legacy)

```csharp
// This includes execution services which you might not need
builder.Services.AddSiyeFlow(options => { /* ... */ });
app.UseSiyeFlow();
```

## Usage

1. **Access the Designer**: Navigate to `http://your-api/workflows`

2. **Create Workflows**:
   - Drag API endpoints from the left sidebar
   - Drop them onto the canvas
   - Connect blocks using the side ports
   - Green lines = success paths
   - Red lines = failure paths

3. **Configure Steps**:
   - Click on a block to see its properties
   - Add parameters, headers, and body content
   - Extract variables from responses
   - Set conditions for execution

4. **Save/Load Workflows**:
   - Use the toolbar buttons to save/load workflow JSON files
   - Compatible with SiyeFlow CLI for execution

## Configuration Options

```csharp
options.RoutePrefix = "workflows";      // URL path for the designer
options.DocumentTitle = "My Workflows"; // Browser title
options.MaxFileSize = 5242880;         // Max upload size (5MB default)
```

## What's NOT Included

This is a design-only tool. It does NOT include:
- ❌ Workflow execution endpoints
- ❌ SignalR hubs for real-time execution
- ❌ CLI services for running workflows
- ❌ HTTP client factories for API calls

Use this when you want a clean, visual workflow designer without the overhead of execution services.

## Workflow Schema

The designer generates workflows compatible with SiyeFlow CLI:

```json
{
  "name": "My Workflow",
  "description": "Description",
  "variables": {
    "baseUrl": "http://localhost:5216"
  },
  "steps": [
    {
      "id": "step-1",
      "name": "Create Project",
      "operationId": "createProject",
      "body": { /* ... */ },
      "onSuccess": { "goto": "step-2" },
      "onFailure": { "stop": true }
    }
  ]
}
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Requires JavaScript enabled

## License

Part of the SiyeFlow project