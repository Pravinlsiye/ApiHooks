# Demo APIs

Sample APIs used to test SiyeFlow end-to-end. Each demo project is a normal ASP.NET Core Web API that also embeds the SiyeFlow designer.

## api1 — SiyeFlow.TestApi

Projects + Jobs CRUD on top of in-memory storage. Includes Swagger and the SiyeFlow designer at `/workflows`.

```bash
cd demo/api1
dotnet run
```

| URL | Purpose |
| --- | --- |
| http://localhost:5216 | API root |
| http://localhost:5216/swagger | Swagger UI |
| http://localhost:5216/workflows | SiyeFlow designer (auto-loads this API's Swagger) |

See [api1/README.md](api1/README.md) for endpoints and sample data.

## Run a workflow from the CLI

Sample workflows live in [`src/siye-flow-designer/samples/`](../src/siye-flow-designer/samples). From the repo root:

```bash
dotnet run --project src/SiyeFlow.CLI -- \
    execute --workflow src/siye-flow-designer/samples/1-cat-fact.json
```

## Adding a new demo API

1. Create `demo/api2/` (or similar) as a fresh `dotnet new webapi` project.
2. Add `<ProjectReference Include="..\..\src\SiyeFlow.UI\SiyeFlow.UI.csproj" />`.
3. Wire `builder.Services.AddSiyeFlowDesigner(...)` and `app.UseSiyeFlowDesigner()`.
4. Pick a port that doesn't clash with `api1` (5216).
5. Register the new project in [SiyeFlow.sln](../SiyeFlow.sln).
