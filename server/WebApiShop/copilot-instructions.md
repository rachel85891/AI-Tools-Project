WebApiShop — Agent instructions

Purpose
- Guidance specific to the ASP.NET Core Web API project and its controllers, middleware and startup code.

What to inspect
- `Program.cs` for DI/DbContext registrations and middleware order.
- `Controllers/*` for endpoints; keep controllers thin.
- `appsettings*.json` for environment-specific configuration (connection strings, email).

Common tasks
- Add or modify controllers: prefer adding service calls; do not access DbContext directly from controllers.
- Add middleware: register in `Program.cs` with correct ordering (Exception handling -> CORS -> Routing -> Auth -> Endpoints).

Build/run
- `dotnet run --project WebApiShop`
- Validate via `GET /api/health` (added for quick validation).