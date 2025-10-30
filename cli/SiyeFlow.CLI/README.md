# SiyeFlow CLI

A powerful block-based workflow automation tool for APIs. Design workflows visually, execute them via CLI.

## Features

✨ **Block-Based Architecture** - Modular, reusable workflow blocks
🔧 **Multiple Block Types** - HTTP requests, conditions, loops, data processing
📊 **Data Transformation** - JSONPath extraction and TypeScript evaluation
🔄 **Flow Control** - Conditional branching, loops, try/catch error handling
⏱️ **Timing Control** - Delays, retries, timeouts
📝 **Debugging** - Built-in logging blocks and detailed execution traces
🎯 **Type Safety** - Start/End blocks define clear input/output contracts

## Installation

```bash
cd cli/SiyeFlow.CLI
dotnet build
```

## Usage

### Execute a Workflow

```bash
# Basic execution (API definition is optional!)
dotnet run -- execute --workflow workflow.json

# With API definition (for validation, operationId lookup, etc.)
dotnet run -- execute --workflow workflow.json --api openapi.json

# With inputs
dotnet run -- execute -w workflow.json --inputs '{"projectName": "My Project"}'

# Dry run mode
dotnet run -- execute -w workflow.json --dry-run

# Save results
dotnet run -- execute -w workflow.json --output results.json

# Verbose logging
dotnet run -- execute -w workflow.json -a api.json --verbose
```

### Validate a Workflow

```bash
# Validate structure
dotnet run -- validate --workflow workflow.json

# Validate with API
dotnet run -- validate -w workflow.json -a api.json
```

### Generate Documentation

```bash
# Single workflow
dotnet run -- docs --workflow workflow.json

# All workflows in directory
dotnet run -- docs -w ./workflows --output ./docs
```

## Workflow Schema

### Basic Structure

```json
{
  "name": "My Workflow",
  "description": "Description of the workflow",
  "blocks": [
    {
      "id": "unique-id",
      "type": "block-type",
      "name": "Human readable name",
      "config": { /* block-specific config */ },
      "inputs": { /* input mappings */ },
      "outputs": { /* output mappings */ },
      "onSuccess": "next-block-id",
      "onFailure": "error-block-id"
    }
  ]
}
```

### Block Types

#### Start Block
```json
{
  "id": "start",
  "type": "start",
  "config": {
    "inputs": {
      "orderId": { "type": "string", "required": true },
      "options": { "type": "object", "required": false }
    }
  }
}
```

#### HTTP Request Block
```json
{
  "id": "fetch-data",
  "type": "http-request",
  "config": {
    "method": "GET",
    "url": "{{baseUrl}}/api/orders/{{orderId}}",
    "headers": { "Authorization": "Bearer {{token}}" },
    "retries": 3
  }
}
```

#### Condition Block
```json
{
  "id": "check-status",
  "type": "condition",
  "config": {
    "expression": "inputs.order.status === 'pending'"
  },
  "branches": {
    "true": "process-order",
    "false": "skip-order"
  }
}
```

#### Loop Block
```json
{
  "id": "process-items",
  "type": "loop",
  "config": {
    "items": "{{order.items}}",
    "parallel": true,
    "maxConcurrency": 5
  },
  "loopBody": "process-single-item"
}
```

#### Evaluate Block (JSONPath)
```json
{
  "id": "extract-data",
  "type": "evaluate",
  "config": {
    "language": "jsonpath",
    "expressions": {
      "total": "$.order.total",
      "items": "$.order.items[*]"
    }
  }
}
```

#### Evaluate Block (TypeScript)
```json
{
  "id": "calculate",
  "type": "evaluate",
  "config": {
    "language": "typescript",
    "code": "return inputs.items.reduce((sum, item) => sum + item.price, 0);"
  }
}
```

## Example Workflow

```json
{
  "name": "Order Processing",
  "description": "Process an order with error handling",
  "blocks": [
    {
      "id": "start",
      "type": "start",
      "config": {
        "inputs": {
          "orderId": { "type": "string", "required": true }
        }
      },
      "onSuccess": "fetch-order"
    },
    {
      "id": "fetch-order",
      "type": "http-request",
      "config": {
        "method": "GET",
        "url": "/api/orders/{{orderId}}"
      },
      "outputs": {
        "order": "$.response"
      },
      "onSuccess": "check-status",
      "onFailure": "handle-error"
    },
    {
      "id": "check-status",
      "type": "condition",
      "config": {
        "expression": "inputs.order.status === 'pending'"
      },
      "branches": {
        "true": "process-order",
        "false": "end"
      }
    },
    {
      "id": "process-order",
      "type": "http-request",
      "config": {
        "method": "POST",
        "url": "/api/orders/{{orderId}}/process",
        "body": { "action": "approve" }
      },
      "onSuccess": "end",
      "onFailure": "handle-error"
    },
    {
      "id": "handle-error",
      "type": "log",
      "config": {
        "level": "error",
        "message": "Failed to process order {{orderId}}"
      },
      "onSuccess": "end"
    },
    {
      "id": "end",
      "type": "end",
      "config": {
        "outputs": {
          "success": { "type": "boolean", "value": "{{success}}" },
          "order": { "type": "object", "value": "{{order}}" }
        }
      }
    }
  ]
}
```

## Variable System

### Variable References
- `{{variableName}}` - Simple variable reference
- `{{object.property}}` - Nested property access
- `{{array[0]}}` - Array index access

### Special Variables
- `{{$timestamp}}` - Current timestamp
- `{{$workflowId}}` - Workflow identifier
- `{{$loopIndex}}` - Current loop iteration (in loops)
- `{{$loopItem}}` - Current item (in loops)
- `{{$error}}` - Error object (in catch blocks)

## Architecture

The CLI uses a modular block-based architecture:

- **Blocks** - Self-contained units of work
- **Block Executors** - Execute specific block types
- **Variable Store** - Manages variables and evaluations
- **Workflow Executor** - Orchestrates block execution

## Contributing

1. Add new block types in `Services/Blocks/`
2. Register in `BlockRegistry`
3. Update documentation

## License

Part of the SiyeFlow project