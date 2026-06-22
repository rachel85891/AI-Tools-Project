# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build and Run

```powershell
# Run the full stack (API + Redis + Kafka + Zookeeper) via Docker
docker-compose up --build

# Run the API locally (requires SQL Server and Redis/Kafka running separately)
cd server/WebApiShop
dotnet run

# Build only
cd server
dotnet build
```

### Tests

```powershell
# Run all tests
cd server/Tests
dotnet test

# Run a single test class
cd server/Tests
dotnet test --filter "FullyQualifiedName~OrderRepositoryIntegrationTests"

# Run a single test method
dotnet test --filter "FullyQualifiedName~OrderRepositoryIntegrationTests.Checkout_HappyPath_ComputesSumAndUpdatesStatuses"
```

### Database Migrations (EF Core)

```powershell
# From server/WebApiShop
dotnet ef migrations add <MigrationName> --project ../Entities
dotnet ef database update --project ../Entities
```

### Kafka Worker (separate process)

```powershell
cd server/KafkaWorker
dotnet run
```

## Architecture

The solution is a layered ASP.NET Core 9 Web API for a ticket/shows booking platform ("ShowsCenter"). It has six library projects plus one worker:

```
server/
├── DTOs/           – Request/response data transfer objects
├── Entities/       – EF Core entities and ShowsCenterContext (SQL Server)
├── Repositories/   – EF Core data access (interface + implementation per entity)
├── Services/       – Business logic (interface + implementation per domain)
├── WebApiShop/     – ASP.NET Core host: controllers, middleware, DI wiring
├── KafkaWorker/    – Standalone BackgroundService Kafka consumer
└── Tests/          – xUnit integration and unit tests
```

### Dependency flow

`WebApiShop` → `Services` → `Repositories` → `Entities` ← `DTOs`

`Services.csproj` references `Repositories` and `DTOs`. `WebApiShop.csproj` references only `Services`. `Tests.csproj` references all projects.

### Key infrastructure

- **Database**: SQL Server via EF Core (`ShowsCenterContext` in `Entities/`). Connection string key: `ConnectionStrings:ShowsCenter`.
- **Caching**: Redis-backed `HybridCache` (in-memory L1 + Redis L2). Used in `ShowService` to cache filtered show queries. TTL configured via `Caching:ShowsTtlSeconds` (default 60 s). Redis connection string key: `Redis:ConnectionString`.
- **Messaging**: Confluent Kafka. `IKafkaProducerService` in `Services/` publishes order events to the `order-events` topic on every order create/checkout/seat-lock. The `KafkaWorker` project is a separate `IHostedService` consumer. Kafka errors are swallowed (logged to console) so they don't break the main order flow.
- **Auth**: JWT Bearer tokens. Token is also read from the `X-Access-Token` cookie (`OnMessageReceived` event in `Program.cs`). Manager authorization (`[Authorize(Roles = "Admin")]`) is backed by a hardcoded email allowlist in `Services/Auth.cs` — not by JWT roles.
- **Rate limiting**: Sliding-window policy (`MySlidingPolicy`): 10 requests per minute, 3 segments, queue limit 2, HTTP 429 on rejection.
- **Request logging**: `RatingMiddleware` logs every incoming request (host, method, path, referer, user-agent, timestamp) to the `Ratings` table via `IRatingService`.
- **Email**: SMTP via `EmailSender`; used for password-reset codes. Config keys: `Email:*`. Reset codes expire after `PasswordReset:CodeExpirationMinutes` (default 15 min).
- **Logging**: NLog (`NLog.Web.AspNetCore`).

### Testing approach

Integration tests use **in-memory SQLite** (`Microsoft.Data.Sqlite`) with `ShowsCenterContext`. The `WebApiShop` host skips `app.Run()` and skips SQL Server registration when `ASPNETCORE_ENVIRONMENT=Testing`. `ProgramPartial.cs` exposes `public partial class Program` so `WebApplicationFactory<Program>` can be used.

Unit tests use **Moq** to mock repositories directly, bypassing EF Core.

### Domain model (key entities)

- `Show` — event/performance; has `Provider`, `Category`, many `Section`s
- `Section` — seating section of a show with `Price` and `SectionType`
- `OrderedSeat` — a seat locked or purchased inside an `Order`; `Status 1` = locked/open, `Status 2` = checked out
- `Order` — belongs to a `User`; checkout sums section prices of all status-1 seats and sets them to status 2
- `User` — password stored as BCrypt hash
- `PasswordResetCode` — time-limited 6-digit code for forgot-password flow

### Important conventions

- AutoMapper profiles live in `Services/AutoMapper.cs`.
- The `IAuth.IsManager(userId)` check is email-based (hardcoded list in `Auth.cs`), not role-based — even though controllers use `[Authorize(Roles = "Admin")]`.
- `ShowFilterDTO` drives server-side filtering, sorting (`price`/`popularity`/`title`), and pagination (`skip` = page size, `position` = page number 1-based).
- Swagger UI is available at `/swagger` in Development and includes a JWT Bearer "Authorize" button.
- CORS allows `https://localhost:8080` and `http://localhost:44304` with credentials.