# SiyeFlow - API Workflow Automation

A .NET CLI application that executes API workflows based on OpenAPI specifications and custom flow definitions.

## 🚀 Quick Start

### Prerequisites
- .NET 8 SDK
- Windows, macOS, or Linux

### Installation

```bash
cd cli/SiyeFlow.CLI
dotnet build
```

### Basic Usage

```bash
# Execute a workflow
dotnet run -- --api <openapi.json> --flow <flow.json>

# Dry run (no HTTP calls)
dotnet run -- --api <openapi.json> --flow <flow.json> --dry-run

# Save results
dotnet run -- --api <openapi.json> --flow <flow.json> --output results.json
```

## 📁 Project Structure

```
cli/
└── SiyeFlow.CLI/           # Main workflow execution engine
    ├── Models/             # Data models
    ├── Services/           # Core services
    ├── Interfaces/         # Service contracts
    └── samples/            # Example workflows

demo/
└── api1/                   # Sample API for testing
    ├── Controllers/        # API endpoints
    ├── Models/             # API models
    └── Services/           # In-memory data service
```

## 🧪 Testing

### Option 1: PowerShell Script
```powershell
./run-local-test.ps1
```

### Option 2: Manual Testing
1. Start the Test API:
   ```bash
   cd demo/api1
   dotnet run
   ```

2. In another terminal, run the CLI:
   ```bash
   cd cli/SiyeFlow.CLI
   dotnet run -- --api ./samples/openapi-local.json --flow ./samples/flow-local-test.json
   ```

## 📚 Documentation

- **[SiyeFlow.CLI README](SiyeFlow.CLI/README.md)** - Detailed CLI documentation
- **[SiyeFlow.TestApi README](../demo/api1/README.md)** - Test API documentation

## 🎯 Key Features

- ✅ OpenAPI 3.0 support
- ✅ Variable extraction and injection
- ✅ Conditional workflow execution
- ✅ Retry logic with exponential backoff
- ✅ Dry-run mode for testing
- ✅ Detailed progress tracking
- ✅ Result export to JSON

## 📝 License

This project is provided as-is for demonstration purposes.
