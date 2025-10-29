# SiyeFlow Test API

A simple ASP.NET Core Web API for testing SiyeFlow CLI workflows locally.

## Features

- In-memory data storage (resets on restart)
- Full CRUD operations for Users and Posts
- Swagger UI for API exploration
- CORS enabled for cross-origin requests
- Pre-seeded with sample data

## Endpoints

### Users
- `GET /users` - Get all users
- `GET /users/{id}` - Get user by ID
- `POST /users` - Create new user
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user

### Posts
- `GET /posts` - Get all posts (optional userId query parameter)
- `GET /posts/{id}` - Get post by ID
- `POST /posts` - Create new post
- `PUT /posts/{id}` - Update post
- `DELETE /posts/{id}` - Delete post

## Running the API

### Option 1: Direct Run
```bash
cd SiyeFlow.TestApi
dotnet run
```

The API will be available at:
- HTTP: http://localhost:5216
- HTTPS: https://localhost:7023
- Swagger UI: http://localhost:5216/swagger

### Option 2: Using the Test Runner Script

From the `cli` directory:

```powershell
# PowerShell
./run-local-test.ps1

# With options
./run-local-test.ps1 -Flow flow-local-crud.json
./run-local-test.ps1 -DryRun
```

```cmd
# Command Prompt
run-local-test.cmd
```

## Sample Data

The API starts with pre-seeded data:
- 2 users (John Doe and Jane Smith)
- 3 posts (2 by John, 1 by Jane)

## Testing with SiyeFlow CLI

1. Start the API (see above)
2. In another terminal, run SiyeFlow CLI:

```bash
cd SiyeFlow.CLI
dotnet run -- --api ./samples/openapi-local.json --flow ./samples/flow-local-test.json
```

### Available Test Flows

- `flow-local-test.json` - Basic workflow demonstrating user and post creation
- `flow-local-crud.json` - Complete CRUD operations with cleanup

## Development

The API uses:
- ASP.NET Core 8.0
- In-memory storage (ConcurrentDictionary)
- Built-in dependency injection
- Swagger/OpenAPI for documentation

## Notes

- Data is stored in memory and will be lost when the API stops
- The API includes basic validation (e.g., checking if user exists before creating post)
- All responses follow standard REST conventions
- CORS is configured to allow any origin for testing purposes
