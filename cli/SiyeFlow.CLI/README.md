# SiyeFlow CLI

SiyeFlow CLI is a .NET 8 console application that executes API workflows based on OpenAPI specifications and custom flow definitions.

## Features

- **OpenAPI 3.0 Support**: Parse and validate OpenAPI specifications
- **Workflow Execution**: Execute API calls in sequence with conditional logic
- **Variable Management**: Extract and use variables between API calls
- **Dry Run Mode**: Simulate workflows without making actual HTTP calls
- **Retry Logic**: Automatic retry with exponential backoff
- **Progress Tracking**: Real-time progress updates and detailed logging
- **Result Export**: Save execution results to JSON files

## Installation

1. Ensure you have .NET 8 SDK installed
2. Clone the repository
3. Navigate to the project directory
4. Build the project:

```bash
cd cli/SiyeFlow.CLI
dotnet build
```

## Usage

### Basic Usage

```bash
dotnet run -- --api <path-to-openapi.json> --flow <path-to-flow.json>
```

### Command Line Options

- `--api, -a` (required): Path to OpenAPI 3.0 specification file
- `--flow, -f` (required): Path to workflow definition file  
- `--dry-run, -d`: Simulate the flow without making actual HTTP calls
- `--output, -o`: Save execution results to JSON file
- `--verbose, -v`: Enable verbose logging
- `--help`: Show help information

### Examples

```bash
# Execute a workflow
dotnet run -- --api ./samples/openapi.json --flow ./samples/flow.json

# Dry run mode
dotnet run -- --api ./samples/openapi.json --flow ./samples/flow.json --dry-run

# Save results to file
dotnet run -- --api ./samples/openapi.json --flow ./samples/flow.json --output ./results.json

# Verbose logging
dotnet run -- --api ./samples/openapi.json --flow ./samples/flow.json --verbose
```

## Flow Definition Format

The flow file is a JSON file that defines the workflow steps:

```json
{
  "name": "My Workflow",
  "description": "Description of the workflow",
  "variables": {
    "key": "value"
  },
  "steps": [
    {
      "id": "step1",
      "name": "First API Call",
      "operationId": "getUser",
      "parameters": {
        "userId": "{{userId}}"
      },
      "extractVariables": {
        "userName": "$.name"
      },
      "onSuccess": {
        "goto": "step2"
      },
      "onFailure": {
        "stop": true
      }
    }
  ]
}
```

### Step Properties

- `id`: Unique identifier for the step
- `name`: Human-readable name
- `description`: Optional description
- `operationId`: Reference to OpenAPI operation
- `path`: API path (alternative to operationId)
- `method`: HTTP method (used with path)
- `parameters`: Path and query parameters
- `headers`: HTTP headers
- `body`: Request body
- `condition`: Condition for step execution
- `extractVariables`: Extract values from response
- `onSuccess`/`onFailure`: Actions based on result
- `retries`: Number of retry attempts
- `timeout`: Request timeout in seconds

### Variable Syntax

Use `{{variableName}}` to reference variables in any string value:
- `{{userId}}`: Simple variable reference
- `{{user.name}}`: Nested property access
- Variables can be used in parameters, headers, body, and conditions

### Conditional Execution

Steps can have conditions that determine whether they execute:

```json
{
  "condition": "{{userFound}} == true"
}
```

### Flow Control

Control flow execution with `onSuccess` and `onFailure`:

```json
{
  "onSuccess": {
    "goto": "nextStep",
    "setVariables": {
      "status": "success"
    }
  },
  "onFailure": {
    "stop": true
  }
}
```

## Sample Files

The `samples` directory contains example files:

- `openapi.json`: Sample OpenAPI specification using JSONPlaceholder API
- `flow.json`: Basic workflow example
- `flow-conditional.json`: Example with conditional logic and flow control

## Architecture

The application uses clean architecture with:

- **Models**: Data structures for flows and API definitions
- **Interfaces**: Service contracts
- **Services**: Core business logic
  - `ApiDefinitionLoader`: OpenAPI parsing and validation
  - `FlowExecutor`: Workflow execution engine
  - `VariableStore`: Variable management
  - `ConsoleWriter`: Formatted console output
- **Dependency Injection**: Microsoft.Extensions.DependencyInjection
- **HTTP Client**: IHttpClientFactory for API calls

## Future Enhancements

- Expression evaluation for complex conditions
- Parallel step execution
- Authentication support (OAuth, API keys)
- Webhook support
- Step templates and reusable flows
- Web UI for flow design
- Integration with CI/CD pipelines

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is provided as-is for demonstration purposes.
