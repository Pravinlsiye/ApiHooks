# SiyeFlow.TestApi (api1)

ASP.NET Core Web API used as the demo host for SiyeFlow. It exposes a Projects + Jobs CRUD model, ships Swagger, and embeds the SiyeFlow designer.

- Target: `net10.0`
- Storage: in-memory (resets on restart)
- Auto-seeded sample data (3 projects, 7 jobs)

## Run

```bash
cd demo/api1
dotnet run
```

| URL | Purpose |
| --- | --- |
| http://localhost:5216 | API root (health endpoint at `/`) |
| http://localhost:5216/swagger | Swagger UI |
| http://localhost:5216/workflows | SiyeFlow designer (auto-loads the API's Swagger) |

The HTTPS profile additionally serves `https://localhost:7023` — see [`Properties/launchSettings.json`](Properties/launchSettings.json).

## Endpoints

### Projects

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/projects` | List projects |
| GET | `/api/projects/{id}` | Get project (with its jobs) |
| POST | `/api/projects` | Create |
| PUT | `/api/projects/{id}` | Update |
| DELETE | `/api/projects/{id}` | Delete project and its jobs |

### Jobs (nested under projects)

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/projects/{projectId}/jobs` | List jobs |
| GET | `/api/projects/{projectId}/jobs/{jobId}` | Get job |
| POST | `/api/projects/{projectId}/jobs` | Create |
| PUT | `/api/projects/{projectId}/jobs/{jobId}` | Update |
| DELETE | `/api/projects/{projectId}/jobs/{jobId}` | Delete |

## Models

```json
// Project
{
  "id": "guid",
  "name": "E-Commerce Platform",
  "description": "Building a modern e-commerce platform",
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-02T15:30:00Z",
  "jobs": []
}

// Job
{
  "id": "guid",
  "projectId": "guid",
  "name": "Database Migration",
  "status": "completed",
  "content": { "line1": "...", "line2": "...", "additionalData": {} },
  "createdAt": "...",
  "updatedAt": "..."
}
```

`Job.status` ∈ `pending | running | completed | failed`.

## Designing workflows here

1. Run the API.
2. Open http://localhost:5216/workflows.
3. The API tab on the left auto-loads `swagger/v1/swagger.json`. Drag endpoints onto the canvas.
4. Wire blocks (left-edge inputs, right-edge outputs). Use the success/fail ports on HTTP blocks for branching.
5. Save the workflow JSON to disk (toolbar). Either run it in-browser (the designer ships a browser executor) or via the CLI:

```bash
dotnet run --project ../../src/SiyeFlow.CLI -- \
    execute --workflow path/to/workflow.json
```

Bundled examples live in [`src/siye-flow-designer/samples/`](../../src/siye-flow-designer/samples) — they hit public APIs (catfact, jsonplaceholder, dog.ceo, restcountries) so they work without this demo running.

## Notes

- CORS allows any origin (development convenience).
- Swagger is enabled in `Development`; both Swagger and the designer can also work in Production (depends on host configuration).
- `Properties/launchSettings.json` defines the `http` (5216) and `https` (7023+5216) profiles.
