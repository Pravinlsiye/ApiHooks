# SiyeOps - API Workflow Automation

A comprehensive solution for executing and visualizing API workflows based on OpenAPI specifications.

## 🚀 What's Included

### 1. **SiyeFlow.CLI** - Command Line Tool
Execute API workflows from the command line with powerful features like variable management, conditional logic, and detailed logging.

```bash
cd src/SiyeFlow.CLI
dotnet run -- execute --workflow workflow.json [--api openapi.json]
```

Features:
- Execute workflows with or without OpenAPI definitions
- Variable management (set/get/delete)
- Conditional branching logic
- HTTP requests with JSONPath extraction
- Detailed execution logging

### 2. **SiyeFlow.UI** - Visual Workflow Designer Middleware
Add a visual workflow designer to any ASP.NET Core API with just two lines of code! Like Swagger, but for creating workflows.

```csharp
builder.Services.AddSiyeFlow();
app.UseSiyeFlow();
```

[Learn more →](src/SiyeFlow.UI/README.md)

## 📚 Documentation

- [Schema Design](docs/SCHEMA_DESIGN.md) - Complete workflow schema reference
- [Progress](docs/PROGRESS.md) - Implementation status and tracking
- [HTML Files](docs/HTML_FILES.md) - Differences between production and development HTML files

## 🎯 Key Features

- 🎨 **Visual Workflow Designer** - Drag & drop API endpoints to create workflows
- 📊 **Port-Based Connections** - Visual port system for connecting workflow blocks
- 🔄 **Profile System** - Multiple input profiles for Start blocks (Development/Production/etc.)
- 🔄 **Variable Management** - Define variables and extract data from responses using JSONPath
- 🎯 **Endpoint Discovery** - Automatically loads endpoints from your Swagger/OpenAPI
- 📝 **JSON Export** - Save workflows as JSON files for use with CLI
- 🔌 **Easy Integration** - Embed in any ASP.NET Core application
- 🧩 **Block-Based Architecture** - Modular workflow blocks (HTTP, Condition, Loop, etc.)

## 📦 Quick Start

### Option 1: Command Line Interface

```bash
# Clone the repository
git clone https://github.com/yourusername/SiyeFlow.git
cd SiyeFlow/src/SiyeFlow.CLI

# Run a test workflow (with local API)
cd ../../demo/api1 && dotnet run  # Start API first
cd ../../src/SiyeFlow.CLI
dotnet run -- execute --workflow ../../demo/api1/Workflows/test-http-block.json

# Or run without API definition
dotnet run -- execute --workflow ../../demo/api1/Workflows/test-variable-block.json
```

### Option 2: Add to Your API (Like Swagger)

```csharp
// Install the package
// dotnet add package SiyeFlow.UI

// In your Program.cs
builder.Services.AddSiyeFlow();
app.UseSiyeFlow();

// Navigate to /siyeflow in your browser
```

## 🏗️ Project Structure

```
SiyeFlow/
├── src/                      # All source code
│   ├── SiyeFlow.CLI/        # Command-line workflow engine
│   ├── SiyeFlow.Core/       # Shared models and interfaces
│   ├── SiyeFlow.UI/         # Embeddable UI designer middleware
│   └── siye-flow-designer/  # Standalone TypeScript designer (source)
├── demo/                     # Demo projects
│   └── api1/                # Sample API with test workflows
│       └── Workflows/       # Test workflow files
└── docs/                     # Documentation
    ├── SCHEMA_DESIGN.md     # Block schema reference
    └── PROGRESS.md          # Implementation status
```

## 📋 Workflow Definition Format

Workflows use a **port-based block structure** for maximum flexibility:

```json
{
  "name": "User Registration Workflow",
  "description": "Register user and handle verification",
  "version": "1.0",
  "blocks": [
    {
      "id": "start",
      "type": "start",
      "name": "Start",
      "config": {
        "profiles": [
          {
            "name": "Development",
            "inputs": {
              "email": { "type": "string", "required": true },
              "password": { "type": "string", "required": true }
            }
          }
        ],
        "selectedProfile": "Development"
      },
      "outputPorts": [
        { "name": "success", "type": "success" }
      ],
      "connections": [
        {
          "from": { "blockId": "start", "portName": "success" },
          "to": { "blockId": "register-user", "portName": "input" }
        }
      ]
    },
    {
      "id": "register-user",
      "type": "http-request",
      "name": "Register User",
      "config": {
        "method": "POST",
        "url": "https://api.example.com/users",
        "body": {
          "email": "{{email}}",
          "password": "{{password}}"
        }
      },
      "outputs": {
        "userId": "$.id",
        "status": "$.status"
      },
      "outputPorts": [
        { "name": "success", "type": "success" },
        { "name": "failure", "type": "failure" }
      ]
    },
    {
      "id": "end",
      "type": "end",
      "name": "End"
    }
  ]
}
```

**Key Features:**
- **Port-Based Connections**: Visual port system for connecting blocks
- **Profile System**: Multiple input configurations for Start blocks
- **JSONPath Extraction**: Extract data using `$.path` syntax
- **Variable Interpolation**: Use `{{variableName}}` in configs

## 🖼️ Visual Workflow Designer

The SiyeFlow UI provides an intuitive interface for creating workflows:

- **Drag & Drop**: Simply drag API endpoints or blocks onto the canvas
- **Port-Based Connections**: Connect blocks using visual input/output ports
- **Profile Management**: Switch between different input profiles for Start blocks
- **Properties Panel**: Configure each block's parameters, headers, and body
- **Export to JSON**: Save your workflow for use with the CLI
- **Import Workflows**: Load existing workflow JSON files

## 🔧 Advanced Features

### Conditional Logic
```json
{
  "id": "check-status",
  "name": "Check User Status",
  "operationId": "getUserStatus",
  "onSuccess": {
    "condition": "response.status === 'active'",
    "goto": "send-notification"
  },
  "onFailure": {
    "goto": "retry-later"
  }
}
```

### Variable Extraction
```json
{
  "extractVariables": {
    "token": "$.auth.token",
    "userId": "$.user.id",
    "permissions": "$.user.permissions[*]"
  }
}
```

### Dynamic Parameters
```json
{
  "parameters": {
    "userId": "{{userId}}",
    "timestamp": "{{$timestamp}}",
    "computed": "{{userName.toUpperCase()}}"
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Use Cases

- **API Testing**: Create complex test scenarios
- **Integration Workflows**: Orchestrate multiple APIs
- **Data Migration**: Move data between systems
- **Monitoring**: Create health check workflows
- **Automation**: Automate repetitive API tasks

## 🚀 Future Enhancements

- [x] Visual workflow designer (drag & drop) ✅
- [x] Port-based connections ✅
- [x] Profile system for Start blocks ✅
- [ ] Workflow templates library
- [ ] Parallel step execution
- [ ] Webhook triggers  
- [ ] Scheduled execution
- [ ] Export to code generation
- [ ] Step-by-step debugger
- [ ] Undo/Redo in designer
- [ ] Loop and Try/Catch block executors

---

Built with ❤️ for API automation enthusiasts
