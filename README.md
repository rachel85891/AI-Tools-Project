# ShowsCenter — Web API

A polished, pragmatic Web API for managing shows, seating, orders and providers. Built on .NET 9, this solution is organized into focused projects for domain entities, data access, business logic, and the HTTP API so teams can develop and test independently.

Why this project exists
---
ShowsCenter provides a concise backend for event management: create and browse shows, manage categories and providers, define seating sections with prices, and create orders with ticketed seats. It is designed to be clear and extensible for real applications and demos alike.

Highlights
---
- Clean separation of concerns: `Entities`, `Repositories`, `Services`, `WebApiShop`.
- EF Core powered `ShowsCenterContext` for data mapping and querying.
- AutoMapper between entities and DTOs.
- Filtering, sorting and pagination on show listings.
- Designed to be easy to run, extend and test.

Prerequisites
---
- .NET 9 SDK
- SQL Server (or any ADO.NET-compatible provider)

Getting started (local development)
---
1. Clone the repository:

```bash
git clone https://github.com/meanochi/WebApiShop.git
cd WebApiShop
```

2. Configure the database connection:

Add a `ConnectionStrings:DefaultConnection` entry to `WebApiShop/appsettings.json`, or update `Program.cs` to use your chosen connection string. Example:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=.;Initial Catalog=ShowsCenter;Integrated Security=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
  }
}
```

Important: `Program.cs` currently registers `ShowsCenterContext` twice. Keep a single `AddDbContext<ShowsCenterContext>(...)` registration that uses `DefaultConnection` to avoid inconsistent runtime behavior.

3. Create or update the database schema:

If you use EF Migrations (recommended):

```bash
cd WebApiShop
dotnet ef database update --project ../Entities --startup-project .
```

Alternatively run the SQL scripts that create the schema if you maintain them separately.

4. Run the API:

```bash
cd WebApiShop
dotnet run
```

Usage examples
---
- Get a paginated, sorted list of shows:

```bash
curl "https://localhost:5001/api/shows?position=1&skip=10&sortField=price&sortOrder=1"
```

- Get a show by id:

```bash
curl "https://localhost:5001/api/shows/5"
```

- Create a show (example JSON):

```json
{
  "title": "The Little Concert",
  "date": "2026-06-15",
  "beginTime": "19:30:00",
  "endTime": "21:30:00",
  "audience": "General",
  "sector": "Main Hall",
  "description": "Sample performance",
  "providerId": 1,
  "categoryId": 2
}
```

Architecture and rationale
---
Solution structure:
- `Entities` — POCO model classes that represent tables and relationships.
- `Repositories` — data access layer encapsulating EF Core queries and transactions.
- `Services` — business logic, orchestration and validation between repositories and the API.
- `WebApiShop` — ASP.NET Core Web API project with controllers, DI setup, CORS and Swagger.

Why this layout?
- Modularity: each layer has a single responsibility, making the codebase easier to test and maintain.
- Testability: `Repositories` and `Services` can be mocked during controller tests.
- Flexibility: business rules are centralized in `Services`, keeping controllers thin and focused on HTTP concerns.

Troubleshooting
---
1) "Invalid object name 'Shows'"
- Cause: EF Core generated SQL that references a table named `Shows`, but the connected database doesn't contain that table (wrong DB, missing migrations, or different schema/table name).
- Steps to fix:
  - Confirm which connection string the app uses at runtime. (Log or print `_context.Database.GetDbConnection().ConnectionString`.)
  - Ensure your intended database contains the `Shows` table (run `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE 'Show%';`).
  - Run `dotnet ef database update` or apply your schema scripts.
  - Remove duplicate `AddDbContext` registrations in `Program.cs` to make sure only one connection string is used.
  - If your SQL table name differs, explicitly map the entity to the table: `modelBuilder.Entity<Show>().ToTable("ActualTableName");` in `OnModelCreating`.

2) Debugging queries
- To inspect the SQL EF produces, print `query.ToQueryString()` before execution. That helps correlate EF LINQ with the SQL hitting your database.

Developer notes & recommended improvements
---
- Avoid constructing huge compound predicates; build `IQueryable` step-by-step and append `.Where(...)` only when filters are present.
- Use projections (`Select`) to DTOs where appropriate to reduce payload and memory usage.
- Consider indexing and a computed/denormalized column for `minPrice` if you sort frequently by section minimum price.

Contributing
---
Contributions are welcome. Suggested workflow:
1. Open an Issue describing the change or bug.
2. Create a branch: `feature/<short-desc>` or `fix/<short-desc>`.
3. Provide tests for significant behavior and open a Pull Request with a clear description and rationale.

Please follow these guidelines:
- Keep public APIs and DB connection configuration stable unless necessary.
- Add unit tests for business logic in `Services`.
- Keep code consistent with .NET naming and async/await conventions.

License & contact
---
This repository is available at: `https://github.com/meanochi/WebApiShop`.
Open issues or PRs in that repository to collaborate or request changes.

Last updated: compatible with .NET 9. Update `Program.cs` and `appsettings.json` for environment-specific configuration.