# Copilot Instructions for ShowsCenter

## What this app does
`TimeBank` is an Angular 21 ticketing app for browsing shows, filtering by category/audience/sector, selecting seats, managing cart/checkout, and handling user auth/profile. The frontend expects a separate backend API under `/api` (proxied to `https://localhost:44304`).

## Tech stack
- Angular 21 standalone architecture (no NgModules)
- TypeScript 5.9 with strict compiler settings
- PrimeNG 21 + PrimeFlex + PrimeIcons + Bootstrap 5
- RxJS 7
- Angular SSR files are present (`src/main.server.ts`, `src/server.ts`)
- Package manager: `npm` (`packageManager`: `npm@11.6.2`)

## Project structure
- `src/app/components/` UI components by domain (`products`, `users`, `cart`, `checkout`, etc.)
- `src/app/services/` API + state services
- `src/app/models/` shared data models
- `src/app/app.routes.ts` app routes
- `src/app/app.config.ts` global providers (router, http, PrimeNG theme, toast/confirm services)
- `public/` static assets
- `backend-forgot-password/` reference .NET 9 backend layers for forgot-password + order-confirmation email flow (not wired into Angular build)
- `BACKEND_LOCK_API.md` backend contract note for seat-lock API mapping

## First-run and daily commands
Run from repo root:

```powershell
npm ci
npm start
```

Useful scripts:
- `npm start` -> `ng serve` (uses `proxy.conf.json` automatically)
- `npm run build` -> production build
- `npm run watch` -> development build watch
- `npm test` -> unit tests (`@angular/build:unit-test` + Vitest globals)

Build note:
- `npm run build` currently succeeds with bundle/style budget warnings in existing files. Treat these as known warnings unless your change significantly increases bundle/style size.

## API/proxy expectations (common source of failures)
- Frontend calls relative paths like `/api/Shows`, `/api/Users/...`.
- Dev server proxy is defined in `proxy.conf.json`:
  - `/api` -> `https://localhost:44304`
  - `secure: false` (self-signed cert accepted locally)
- If UI shows 404/API errors, verify backend is running at `https://localhost:44304` before changing frontend code.
- Seat lock flow depends on `BACKEND_LOCK_API.md`: backend must persist `ShowId -> OrderedSeats.Show_id` and `Status` (reservation status).

## Coding guidelines for this repo
- Keep standalone-component style:
  - Add dependencies via `imports: []` inside components.
  - Add new routes in `src/app/app.routes.ts`.
- Preserve strict TypeScript compatibility (`tsconfig.json` strict flags enabled).
- Follow formatting conventions:
  - 2 spaces, UTF-8, final newline (`.editorconfig`)
  - single quotes in TS
  - Prettier config in `package.json` (`printWidth: 100`, Angular HTML parser)
- Keep service API paths relative (`/api/...`), not hardcoded full hosts.
- Reuse existing services/state streams before adding duplicate state containers.
- Be careful with existing backend contract spellings used by API:
  - `category-srvice.ts` filename typo is intentional in current codebase.
  - `/api/Users/isManger` endpoint spelling is currently used by frontend.

## Existing resources to consult before major changes
- `README.md` (Angular CLI baseline commands)
- `BACKEND_LOCK_API.md` (seat lock backend mapping requirements)
- `backend-forgot-password/README.md` (.NET integration steps for forgot/reset password + confirmation email)

## Agent workflow recommendations
1. Inspect affected domain component + corresponding service + model together.
2. For data issues, check request parameter names against backend expectations before refactoring.
3. Validate with `npm run build` after edits; use `npm test` when touching logic with tests nearby.
4. Do not rename API fields/endpoints solely for typo cleanup unless backend is updated in the same change.
5. When adding UI features, keep Hebrew-facing copy consistent with existing UX language.
