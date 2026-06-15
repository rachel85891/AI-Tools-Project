# Repo onboarding instructions for an automated coding agent

Purpose
- Help an agent understand and work efficiently with this repository on first sight. Keep changes minimal and safe, favoring buildable edits and small, testable features.

What this app does (summary)
- ShowsCenter is a backend Web API (ASP.NET Core) for managing shows, seating sections, providers and orders. It exposes REST controllers, uses EF Core for persistence, AutoMapper for DTO mapping, NLog for logging and MailKit for outbound mail.

Tech stack
- .NET 9 (C#) / ASP.NET Core Web API
- EF Core (SqlServer provider) in `Entities` and `Repositories` projects
- AutoMapper, NLog, MailKit
- Tests use xUnit + Moq + SQLite in-memory provider for EF Core tests

Project layout (high level)
- `Entities` — EF models and `ShowsCenterContext`.
- `Repositories` — data-access layer (EF queries, migrations live here).
- `Services` — business logic and orchestration.
- `WebApiShop` — ASP.NET Core project: controllers, DI, middleware, Swagger, startup code (`Program.cs`).
- `DTOs` — DTO definitions for API.
- `Tests` — unit/integration tests.

Primary files to inspect first
- `README.md` — project overview and known issues.
- `WebApiShop/Program.cs` — DI registrations, DbContext and middleware ordering.
- `WebApiShop/appsettings*.json` — connection strings and environment settings (key: `ShowsCenter`).
- `Entities` project for EF mappings and `OnModelCreating` customizations.
- `Repositories` for raw SQL or query workarounds.

Coding and operational guidelines (short)
- Keep controllers thin. Put business logic into `Services` and data access into `Repositories`.
- Use constructor DI for all services/repositories. Prefer `async` methods where IO occurs.
- Build EF queries stepwise on `IQueryable` and project to DTOs before materializing large payloads.
- Avoid duplicate `AddDbContext<ShowsCenterContext>(...)` registrations in `Program.cs` — ensure only one and it uses the intended connection string.
- Prefer `dotnet` CLI rather than shell-specific scripts. Use explicit `--project` and `--startup-project` where ambiguity is possible.

Common commands (copy-paste)
- Build solution: `dotnet build`
- Run API: `dotnet run --project WebApiShop`
- Update DB (migrations): `dotnet ef database update --project Entities --startup-project WebApiShop`
- Run tests: `dotnet test`

Search tips (reduce time exploring)
- Find temporary notes/workarounds: `git grep -n "TODO\|FIXME\|HACK\|WORKAROUND" || true`
- List csproj files: `git ls-files | grep -E '\.csproj$' || true`

Quick troubleshooting notes
- "Invalid object name" usually means wrong DB or missing migrations. Verify runtime connection string and run EF update with explicit project args.
- If edits appear not applied while debugging, restart the app (or use hot-reload). Always run `dotnet build` to catch compile errors first.

Validation & example
- A small `GET /api/health` endpoint was added to validate the repo boots and responds. To validate, `dotnet run --project WebApiShop` and `curl http://localhost:<port>/api/health`.

If you need to change DB or run migrations, always use explicit `--project`/`--startup-project`. When proposing code edits, produce small, buildable diffs and include unit tests where applicable.