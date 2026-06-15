Repositories — Agent instructions

Purpose
- Guidance for the data-access layer: EF Core usage, repository patterns, migrations and queries.

What to inspect
- Repository implementations (`Repositories/*.cs`) for EF queries and transaction handling.
- `Repositories/Migrations` for model snapshots and migration history.
- `Repositories.csproj` for package versions (Microsoft.EntityFrameworkCore.*).

Coding guidelines
- Keep EF logic inside repositories. Services should not use DbContext directly.
- Use `async` EF methods (`ToListAsync`, `FirstOrDefaultAsync`, etc.).
- Build `IQueryable` incrementally; avoid early `ToList()`/`ToArray()` before applying pagination or projections.
- Prefer projection to DTOs in repository methods that return lists to avoid loading full entities when not needed.
- Use explicit `AsNoTracking()` for read-only queries to reduce tracking overhead.

Migrations & DB notes
- Migrations and snapshots live in `Repositories/Migrations`. Use explicit project flags for EF commands:
  - `dotnet ef migrations add <name> --project Repositories --startup-project WebApiShop`
  - `dotnet ef database update --project Repositories --startup-project WebApiShop`

Testing
- Repository tests can use `Microsoft.EntityFrameworkCore.Sqlite` in-memory mode or `Moq.EntityFrameworkCore` to mock DbSets.

Quick commands
- Build: `dotnet build`
- Run repository unit tests via solution `dotnet test` (Tests project covers repositories via integration/unit tests).