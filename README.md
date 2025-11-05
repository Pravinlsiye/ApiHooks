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

- [Schema Design](docs/SCHEMA_DESIGN.md) - Complete workflow schema
- [Progress](docs/PROGRESS.md) - Implementation status

## 🎯 Key Features

- 🎨 **Visual Workflow Designer** - Drag & drop API endpoints to create workflows
- 📊 **Interactive Block Diagrams** - See your workflow as connected blocks  
- 🔄 **Variable Management** - Define variables and extract data from responses
- 🎯 **Endpoint Discovery** - Automatically loads endpoints from your Swagger/OpenAPI
- 📝 **JSON Export** - Save workflows as JSON files for use with CLI
- 🔌 **Easy Integration** - Embed in any ASP.NET Core application

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
│   └── SiyeFlow.UI/         # Embeddable UI designer
├── demo/                     # Demo projects
│   └── api1/                # Sample API with test workflows
│       └── Workflows/       # Test workflow files
└── docs/                     # Documentation
    ├── SCHEMA_DESIGN.md     # Block schema reference
    └── PROGRESS.md          # Implementation status
```

## 📋 Workflow Definition Format

Workflows use a block-based JSON structure for maximum flexibility:

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
        "inputs": {
          "email": { "type": "string", "required": true },
          "password": { "type": "string", "required": true }
        }
      },
      "onSuccess": "register-user"
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
      "onSuccess": "send-email"
    },
    {
      "id": "send-email",
      "type": "http-request",
      "name": "Send Welcome Email",
      "config": {
        "method": "POST",
        "url": "https://api.example.com/emails",
        "body": {
          "userId": "{{userId}}",
          "template": "welcome"
        }
      },
      "onSuccess": "end"
    },
    {
      "id": "end",
      "type": "end",
      "name": "End"
    }
  ]
}
```

## 🖼️ Visual Workflow Designer

The SiyeFlow UI provides an intuitive interface for creating workflows:

- **Drag & Drop**: Simply drag API endpoints onto the canvas
- **Visual Connections**: Connect steps with visual lines
- **Properties Panel**: Configure each step's parameters, headers, and body
- **Export to JSON**: Save your workflow for use with the CLI or API

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
- [ ] Workflow templates library
- [ ] Parallel step execution
- [ ] Webhook triggers  
- [ ] Scheduled execution
- [ ] Export to code generation
- [ ] Step-by-step debugger
- [ ] Undo/Redo in designer

---

Built with ❤️ for API automation enthusiasts
