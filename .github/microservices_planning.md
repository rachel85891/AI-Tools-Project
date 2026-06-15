Microservices planning (high-level)

Purpose
- Provide a concise, non-actionable plan for splitting this monolithic Web API into microservices. This document is planning-only: it focuses on boundaries, data ownership, integration patterns, and migration approach — not implementation details.

Goals for decomposition
- Improve independent deployability, scalability and fault isolation.
- Keep bounded contexts small and cohesive (align services to clear business capabilities).
- Minimize cross-service synchronous calls and preserve transactional consistency with eventual consistency patterns.

Candidate service boundaries (suggested)
- `Identity` (Users, Authentication, Password reset)
  - Responsible for user profiles, credentials, password resets, and auth tokens.
- `Catalog` (Shows, Categories, Providers, Images)
  - Read/write show metadata, categories, provider data and image metadata.
- `Inventory` / `Seating` (Sections, Seats, Pricing)
  - Manage seating sections, seat availability and pricing; provide minPrice per show.
- `Ordering` (Orders, OrderedSeats, Payments)
  - Create and manage orders, reserved seats, payment orchestration, order lifecycle.
- `Notification` (Emails, Order confirmations)
  - Email sending and templates; retry/backoff and audit of outbound messages.
- `Ratings` (Ratings and reviews)
  - Accept and aggregate ratings, separate read model for averages.
- `Gateway` (edge/API gateway)
  - Single public entry point: authentication, routing, rate-limiting, aggregation for frontend.

Data ownership & persistence
- Each service owns its own database schema and persists its own entities. No shared DB tables.
- For read-heavy views that combine data, consider maintaining a read-model (CQRS) or use API composition.

Integration patterns
- Prefer asynchronous messaging (event-driven) for cross-service updates (e.g., `OrderCreated`, `SeatsReserved`, `ShowUpdated`).
- Use a lightweight message broker (RabbitMQ, Kafka, or Azure Service Bus) depending on infra.
- For necessary sync operations, use well-defined HTTP APIs via the `Gateway`; keep call graph shallow.

Consistency & transactions
- Avoid distributed ACID transactions. Use sagas or process managers for long-running multi-service flows (reserve seats -> charge payment -> confirm order).
- Design compensating actions for failure cases (release seats, refund payments).

Authentication & security
- Centralize authentication in `Identity` and issue JWTs. Services validate tokens locally.
- Use role/claim-based authorization where required.

Observability & operations
- Add structured logging, distributed tracing (OpenTelemetry), and metrics (Prometheus/Grafana).
- Each service should expose health and readiness probes for orchestration.

Migration strategy (incremental)
1. Extract read-only or low-risk services first (e.g., `Ratings`, `Notification`).
2. Introduce the `Gateway` and route traffic selectively.
3. Incrementally move write paths with event contracts and sagas.
4. Maintain compatibility layers (adapters) to avoid breaking clients.

CI/CD and deployment
- Containerize services (Docker) and provide deployment manifests (Kubernetes / Docker Compose) as needed.
- Automate tests, builds and image releases. Prefer small, focused pipelines per service.

Risks & mitigations
- Increased operational complexity: mitigate with robust observability and automation.
- Data consistency issues: mitigate with clear event contracts and sagas.

Recommended first pilot
- Extract `Notification` (email) or `Ratings` as the pilot service — small surface area, testable, low blast radius.

Where to document next
- For each chosen service, add a lightweight ADR (Architecture Decision Record) describing API contract, events, data model and deployment requirements.