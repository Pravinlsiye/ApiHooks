# SiyeOps - API Workflow Automation

A comprehensive solution for executing and visualizing API workflows based on OpenAPI specifications.

## 🚀 What's Included

### 1. **SiyeFlow.CLI** - Command Line Tool
Execute API workflows from the command line with powerful features like variable management, conditional logic, and detailed logging.

```bash
dotnet run -- --api openapi.json --flow workflow.json
```

[Learn more →](cli/README.md)

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
git clone https://github.com/yourusername/siyeOps.git
cd siyeOps/cli/SiyeFlow.CLI

# Run a sample workflow
dotnet run -- --api samples/openapi.json --flow samples/flow.json
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
siyeOps/
├── cli/                      # Command-line interface
│   └── SiyeFlow.CLI/        # Main CLI project
├── src/                      # Source libraries
│   └── SiyeFlow.UI/         # Embeddable UI middleware
├── demo/                     # Demo projects
│   └── api1/                # Sample API for testing
└── examples/                 # Example implementations
    └── ApiWithSiyeFlow/     # Example API with SiyeFlow UI
```

## 📋 Workflow Definition Format

Workflows are defined in JSON with a simple, intuitive structure:

```json
{
  "name": "User Registration Flow",
  "description": "Register a user and send welcome email",
  "variables": {
    "baseUrl": "https://api.example.com"
  },
  "steps": [
    {
      "id": "register",
      "name": "Register User",
      "operationId": "registerUser",
      "body": {
        "email": "user@example.com",
        "password": "secure123"
      },
      "extractVariables": {
        "userId": "$.id"
      }
    },
    {
      "id": "welcome",
      "name": "Send Welcome Email",
      "operationId": "sendEmail",
      "body": {
        "userId": "{{userId}}",
        "template": "welcome"
      }
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
