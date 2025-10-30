# SiyeFlow Demo API - Projects & Jobs

A modern ASP.NET Core Web API designed for demonstrating SiyeFlow workflows with a realistic project management scenario.

## Features

- RESTful API for Projects and Jobs management
- In-memory data storage (resets on restart)
- Full CRUD operations for Projects and nested Jobs
- Swagger UI for API exploration
- **SiyeFlow Visual Workflow Designer** ✨ (design-only, no execution)
- CORS enabled for cross-origin requests
- Pre-seeded with realistic sample data

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/{id}` - Get project by ID (includes jobs)
- `POST /api/projects` - Create new project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project (and all its jobs)

### Jobs (Nested under Projects)
- `GET /api/projects/{projectId}/jobs` - List all jobs for a project
- `GET /api/projects/{projectId}/jobs/{jobId}` - Get specific job
- `POST /api/projects/{projectId}/jobs` - Create new job
- `PUT /api/projects/{projectId}/jobs/{jobId}` - Update job
- `DELETE /api/projects/{projectId}/jobs/{jobId}` - Delete job

## Data Models

### Project
```json
{
  "id": "guid",
  "name": "E-Commerce Platform",
  "description": "Building a modern e-commerce platform",
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-02T15:30:00Z",
  "jobs": []
}
```

### Job
```json
{
  "id": "guid",
  "projectId": "guid",
  "name": "Database Migration",
  "status": "completed", // pending, running, completed, failed
  "content": {
    "line1": "Migrated 50,000 products to new schema",
    "line2": "Completed in 2 hours with zero downtime",
    "additionalData": {}
  },
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

## Running the API

### Direct Run
```bash
cd demo/api1
dotnet run
```

The API will be available at:
- **API Base**: http://localhost:5216
- **Swagger UI**: http://localhost:5216/swagger
- **SiyeFlow Designer**: http://localhost:5216/workflows

### Using PowerShell Script
```powershell
# From the cli directory
./run-local-test.ps1
```

## Sample Data

The API starts with pre-seeded data:
- **3 Projects**: E-Commerce Platform, Data Analytics Dashboard, Mobile App Backend
- **7 Jobs**: Various jobs across projects with different statuses

### Sample Projects:
1. **E-Commerce Platform**
   - Database Migration (completed)
   - Payment Integration (running)
   - Security Audit (pending)

2. **Data Analytics Dashboard**
   - Data Pipeline Setup (completed)
   - Dashboard UI Development (running)

3. **Mobile App Backend**
   - API Documentation (completed)
   - Load Testing (failed)

## Testing with SiyeFlow

### Visual Workflow Designer (Design-Only)
1. Start the API
2. Open http://localhost:5216/workflows
3. Design workflows by:
   - Dragging endpoints from the left sidebar
   - Connecting blocks with side-mounted ports (success/failure paths)
   - Configuring parameters in the properties panel
4. Save workflow as JSON for use with the SiyeFlow CLI
5. Note: This is a design-only tool - workflow execution happens via the CLI

### Pre-built Workflow Examples

The `Workflows` directory contains ready-to-use workflow examples:

- **openapi.json** - Full OpenAPI specification for external APIs
- **openapi-local.json** - OpenAPI spec configured for local testing
- **simple-project.json** - Basic workflow creating a project with jobs
- **conditional-project.json** - Advanced workflow with conditional logic
- **crud-operations.json** - Complete CRUD operations demonstration
- **simple-demo.flow.json** - Simple demonstration workflow
- **local-crud.flow.json** - Local CRUD operations workflow

Run these workflows using the SiyeFlow CLI:
```bash
cd cli/SiyeFlow.CLI
dotnet run -- --api ../../demo/api1/Workflows/openapi-local.json --flow ../../demo/api1/Workflows/simple-project.json
```

### Example Workflow Ideas

#### Project Setup Workflow
1. Create new project
2. Add initial jobs (Setup, Development, Testing)
3. Update project status
4. List all project jobs

#### Job Processing Workflow
1. List projects
2. Get specific project details
3. Create new job for the project
4. Update job status to "running"
5. Update job status to "completed"

#### Cleanup Workflow
1. List all projects
2. Delete jobs with "failed" status
3. Archive completed projects

## Development Notes

- Built with ASP.NET Core 8.0
- Uses in-memory storage (ConcurrentDictionary)
- All data includes proper timestamps
- Job statuses: pending, running, completed, failed
- CORS configured for development testing
- Integrated with SiyeFlow.UI for visual workflow design

## Response Examples

### List Projects Response
```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "E-Commerce Platform",
    "description": "Building a modern e-commerce platform",
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-02T15:30:00Z",
    "jobs": []
  }
]
```

### Create Job Request
```json
{
  "name": "New Feature Development",
  "status": "pending",
  "content": {
    "line1": "Implementing user authentication",
    "line2": "Using JWT tokens for security"
  }
}
```

## Tips for Workflow Design

1. Use the visual designer to prototype workflows
2. Projects are the main entities - jobs are always nested
3. Job statuses can be used for conditional logic
4. The content field in jobs is flexible for demo purposes
5. All timestamps are in UTC