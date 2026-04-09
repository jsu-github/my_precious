# Precious Dashboard — Workspace Instructions

Sovereign Risk Management dashboard for defensive investors. Tracks assets
across customizable risk dimensions (gross/net scores + mitigations) with
capital-weighted portfolio scoring. Single-user, fully local, no auth.

## Build & Dev

```bash
make dev        # Start full stack with hot reload (frontend :3000, API :3001)
make up         # Start production stack (detached)
make down       # Stop containers
make clean      # Stop + remove volumes (full reset)
make logs-api   # Tail API logs
make migrate    # Run migrations manually (normally automatic on API startup)
```

No separate install step — everything runs in Docker.

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | React 18 + TypeScript + Vite 5, installable PWA |
| API | Node.js + Express + TypeScript, port 3001 |
| DB | PostgreSQL 16, accessed via Knex.js |
| Runtime | Docker Compose (single `make dev` starts everything) |

```
api/
  src/
    index.ts          # Express app setup + startup (runMigrations → listen)
    db.ts             # Knex singleton + runMigrations()
    routes/           # One file per resource; nested routes mounted here
    middleware/
      errorHandler.ts # Centralized error handler — must be last middleware
  migrations/         # Sequential Knex migrations (auto-run at API startup)

frontend/
  src/
    api.ts            # ALL fetch calls — single request() helper, no inline fetch
    types.ts          # ALL shared types — one source of truth
    App.tsx           # Root — custom state-based navigation (no router library)
    pages/            # Full-page views
    components/       # Reusable components
```

## Key Conventions

**Navigation:** No React Router. `App.tsx` holds a discriminated union `View` state and conditionally renders pages. Pass `onNavigateToX` callbacks as props — do not import pages into other pages.

**API calls:** Always use `api.*` methods from `frontend/src/api.ts`. Never call `fetch` inline in components. Add new endpoints to `api.ts` and corresponding types to `types.ts`.

**Error shape:** API errors return `{ error: { message: string, status: number } }`. The `request()` helper extracts `error.message` and throws it.

**API routes:** All endpoints are prefixed `/api/` (e.g. `/api/assets`) except `/health`. Nested resource routes are mounted inside the parent router (e.g. scores and mitigations are sub-routes under `assetsRouter`).

**Migrations:** Sequential numbered files in `api/migrations/`. They run automatically at API startup — do not require manual invocation during development. Always use `createTableIfNotExists` / `dropTableIfExists`.

**Score scale:** 5-point enum (1–5): Extra Low / Low / Medium / High / Critical. Scores are stored as integers; labels are derived in the frontend via `SCORE_LABELS[score - 1]`.

**Types:** Define new types in `frontend/src/types.ts`. Use `Pick<T, ...>` and `Partial<>` for input/update types rather than duplicating fields.

## Design

Dark-first UI: `#0f172a` background, `#f8fafc` text. No external UI component library — custom CSS only. See `.github/instructions/frontend-coding-standards.instructions.md` for full design standards (Intentional Minimalism, anti-generic layouts).

## v1 Constraints

- **No auth** — single-user personal tool; backend trusts all requests
- **No live price feeds** — all asset values are entered manually
- **English only** — no i18n infrastructure
