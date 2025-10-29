# Demo APIs

This directory contains sample APIs for testing SiyeFlow CLI workflows.

## 📁 Available APIs

### api1 - SiyeFlow Test API
A simple ASP.NET Core Web API with:
- User management (CRUD operations)
- Post management (CRUD operations)
- In-memory data storage
- Swagger UI documentation

**Start the API:**
```bash
cd api1
dotnet run
```

**Access:**
- HTTP: http://localhost:5216
- Swagger: http://localhost:5216/swagger

## 🧪 Testing with SiyeFlow CLI

From the `cli` directory:

```bash
# Using the test script
./run-local-test.ps1

# Or manually
cd SiyeFlow.CLI
dotnet run -- --api ./samples/openapi-local.json --flow ./samples/flow-local-test.json
```

## 🚀 Adding New APIs

To add new test APIs:

1. Create a new directory: `demo/api2`, `demo/api3`, etc.
2. Add your API implementation
3. Create corresponding OpenAPI specification
4. Add workflow examples in `cli/SiyeFlow.CLI/samples/`

Each API should include:
- OpenAPI 3.0 specification
- README documentation
- Sample data or seed scripts
- Different port configuration to avoid conflicts
