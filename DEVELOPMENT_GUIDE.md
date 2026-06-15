DEVELOPMENT_GUIDE

Summary
- ShowsCenter is a .NET 9 Web API for managing shows, seating sections, orders and providers. It uses EF Core for data access and is organized by projects: `Entities`, `Repositories`, `Services`, `WebApiShop` (HTTP API) and `DTOs` and `Tests`.

Tech stack
- .NET 9 (C#)
- ASP.NET Core Web API
- Entity Framework Core (SQL Server provider)
- AutoMapper
- NLog for logging
- MailKit for email sending

High-level coding guidelines
- Follow .NET naming and async/await conventions.
- Keep controllers thin: move business logic to `Services` and data access to `Repositories`.
- Use dependency injection and constructor injection for services and repositories.
- Prefer `IQueryable`-based filtering and build queries incrementally; project to DTOs where appropriate.
- Avoid duplicate `DbContext` registrations in `Program.cs` — use a single `AddDbContext<ShowsCenterContext>(...)`.

Project structure (top-level projects)
- `Entities` — EF Core model and `ShowsCenterContext`.
- `Repositories` — data access using EF Core; references `Entities` and `DTOs` as needed.
- `Services` — business logic and orchestration.
- `WebApiShop` — ASP.NET Core Web API project with controllers, DI setup, middleware and Swagger.
- `DTOs` — shape objects sent/received by API.
- `Tests` — unit and integration tests.

Existing tools and useful resources
- dotnet CLI (build, run, test, ef)
- EF Core tools (dotnet-ef) for migrations
- Swagger/OpenAPI is enabled in development
- NLog configured in `Program.cs`

Quick start (local)
1. Ensure you have .NET 9 SDK and a SQL Server instance.
2. Update connection string: `WebApiShop/appsettings.json` or `appsettings.Development.json` (key used in `Program.cs` is `ShowsCenter`).
3. Update DB schema: from solution root run
   - `dotnet ef database update --project Entities --startup-project WebApiShop`
   (or run SQL scripts against your DB)
4. Run the API:
   - `cd WebApiShop` then `dotnet run`.
5. Open Swagger in development at `/swagger` or `/openapi/v1.json` depending on environment settings.

Reducing trial-and-error and bash failures
- Use dotnet CLI commands (cross-platform) instead of complex shell scripts.
- Run `dotnet build` frequently to catch compile errors early.
- Use `dotnet ef` from the solution root with explicit `--project` and `--startup-project` to avoid ambiguous project selection.
- Inspect EF SQL with `queryable.ToQueryString()` if a query behaves unexpectedly.

Search guidance for temporary notes and workarounds
- To find markers: `git grep -n "TODO\|FIXME\|HACK\|WORKAROUND"` or use your IDE global search.

Common pitfalls and fixes
- "Invalid object name 'Shows'": wrong DB or missing migrations. Confirm connection string and run `dotnet ef database update` or map entity to correct table name in `OnModelCreating`.
- Duplicate `AddDbContext` in `Program.cs`: ensure only one registration exists and it uses the intended connection string.

Testing a small feature (example)
- A lightweight `GET /api/health` endpoint was added to validate the app boots and responds. Use it after running `dotnet run` to confirm success.

If build or run fails: capture the full `dotnet build` or `dotnet run` output and search for the first error line; fix compile errors before changing runtime configuration.