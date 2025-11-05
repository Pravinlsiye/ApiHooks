# SiyeFlow Block Test Workflows

This directory contains simple test workflows for validating individual block types in the SiyeFlow block-based schema.

## Files

### api-local.json
**Purpose**: Minimal OpenAPI specification for local testing (optional)
- Basic endpoints for projects API
- Can be used with `--api` parameter
- Not required for direct HTTP mode

## Test Workflows

### test-http-block.json
**Purpose**: Test basic HTTP request functionality
- Tests GET request with URL parameters
- Variable replacement in URLs
- Response extraction using JSONPath
- Headers configuration

### test-start-end-blocks.json  
**Purpose**: Test workflow inputs and outputs
- Multiple input types (string, number, boolean)
- Default values for inputs
- Complex output structures
- Variable processing between blocks

### test-http-post.json
**Purpose**: Test resource creation with POST
- JSON request body
- Content-Type headers
- Success/failure branching
- Error handling with multiple end blocks

### test-http-post-jsonplaceholder.json
**Purpose**: Test HTTP POST with public API
- Uses JSONPlaceholder API (no local server needed)
- Creates a new post resource
- Extracts created resource data
- Demonstrates real POST operation

### test-delay-block.json
**Purpose**: Test timing and flow control
- Configurable delay duration
- Log blocks for debugging
- Sequential execution flow
- Time-based operations

### test-http-jsonpath.json
**Purpose**: Test HTTP request with JSONPath extraction (local API)
- Multiple JSONPath expressions
- Array extraction and slicing
- Variable storage and usage
- Complex output mapping

### test-http-jsonpath-posts.json
**Purpose**: Test HTTP request with JSONPath extraction (public API)
- Uses JSONPlaceholder API (no local server needed)
- JSONPath array operations
- Multiple data extractions from single response
- Demonstrates real-world API usage

### visual-test.json
**Purpose**: Test visual designer import functionality
- Multiple block types (HTTP, condition, variable, log)
- Branching logic with success/failure paths
- Multiple end blocks for different outcomes
- Demonstrates new block-based schema

## Test Results

See [TEST_RESULTS.md](./TEST_RESULTS.md) for detailed test execution results and status of each workflow.

## Running Tests

### With API Definition (optional)
```bash
dotnet run -- execute --api openapi-local.json --workflow test-http-block.json
```

### Without API Definition (direct HTTP mode)
```bash
dotnet run -- execute --workflow test-http-block.json --inputs '{"apiUrl": "http://localhost:5216"}'
```

## Block Types Covered

- ✅ **start** - Workflow initialization with inputs
- ✅ **end** - Workflow completion with outputs  
- ✅ **http-request** - GET/POST/PUT/DELETE operations
- ⏳ **delay** - Wait operations (stub)
- ⏳ **log** - Logging messages (stub)
- ⏳ **variable** - Variable assignment (stub)
- ⏳ **condition** - Conditional branching (stub)
- ⏳ **loop** - Iteration over arrays (stub)
- ⏳ **evaluate** - JSONPath/TypeScript evaluation (stub)
- ⏳ **try-catch** - Error handling (stub)
- ⏳ **collect** - Result aggregation (stub)
- ⏳ **workflow** - Sub-workflow execution (stub)

Legend: ✅ Implemented | ⏳ Stub implementation

## Notes

- All test workflows are kept minimal to focus on specific functionality
- Old complex examples have been moved to `old-examples/` directory
- These tests are designed for CLI development and validation