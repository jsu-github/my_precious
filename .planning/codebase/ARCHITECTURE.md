# Architecture
_Last updated: 2026-04-18_

## Overview

Precious Dashboard is a full-stack monorepo with a clean separation between a React SPA frontend (`frontend/`) and an Express REST API backend (`api/`). There is no auth layer — all requests are trusted. State management is entirely local (`useState` per page) with no global state library; navigation is driven by a discriminated union `View` string held in `App.tsx`.

---

## Overall Pattern

**Monorepo with two independent Docker services:**
- `frontend/` — React 18 SPA, served by Vite dev server (dev) or nginx (prod), port 3000
- `api/` — Express REST API, TypeScript, port 3001
- Communication: the Vite proxy forwards `/api/*` to the Express server; in production, nginx proxies `/api/` to the API container

**Separation of concerns:**
- All shared types live in `frontend/src/types.ts` — single source of truth
- All HTTP calls live in `frontend/src/api.ts` — no inline `fetch()` elsewhere
- All DB access goes through the `knex` singleton in `api/src/db.ts` — no raw `pg` calls
- All errors flow through `api/src/middleware/errorHandler.ts` — no per-route error responses

---

## Frontend Architecture

### Navigation Model

No React Router. Navigation state is a discriminated union string type `View`, defined in `frontend/src/components/Sidebar.tsx`:

```typescript
export type View = 'dashboard' | 'ledger' | 'analytics' | 'locations' | 'tax' | 'entity' | 'tier' | 'dealer';
```

`App.tsx` owns `view` and `entityFilter` state. The `renderPage()` switch selects which page component to render. Both values are persisted to `localStorage` so they survive reloads.

**Adding a new page:**
1. Add the new `View` value to the union in `frontend/src/components/Sidebar.tsx`
2. Add a nav item to `NAV_ITEMS` in `frontend/src/components/Sidebar.tsx`
3. Add a case to `renderPage()` in `frontend/src/App.tsx`
4. Create the page component in `frontend/src/pages/`

### Entity Scoping

`EntityFilter` (`'personal' | 'business' | 'global'`) is defined in `frontend/src/components/TopHeader.tsx` and owned by `App.tsx`. It is passed as a prop to every page that needs it. Pages use it to filter API requests (e.g., `api.assets.list(entityId)` or `api.dashboard.summary(entityId)`).

### Component Hierarchy

```
App.tsx                              ← View + EntityFilter state owner
└── AppShell (layouts/AppShell.tsx)
    ├── Sidebar (components/Sidebar.tsx)       ← View nav, defines View type
    ├── TopHeader (components/TopHeader.tsx)   ← EntityFilter toggle, defines EntityFilter type
    └── <page> (pages/*.tsx)                   ← Full-page views, receive entityFilter + onNavigate
        └── modals (components/modals/*.tsx)   ← Overlaid forms for create/edit
```

`AppShell` re-exports `View` and `EntityFilter` so pages can import both from one place: `import type { View, EntityFilter } from '../layouts/AppShell'`.

### State Management

No global state library (no Redux, no Zustand, no Context). Each page manages its own data with `useState` + `useEffect`. Pages fetch on mount and re-fetch when `entityFilter` changes. No shared data cache across pages.

### API Call Pattern

All calls go through named methods on the `api` object in `frontend/src/api.ts`. The underlying `request<T>()` helper prepends `/api` and throws a plain `Error` with the server's `error.message` on non-OK responses.

```typescript
// In a page component:
const [assets, setAssets] = useState<Asset[]>([]);
useEffect(() => {
  api.assets.list().then(setAssets).catch(console.error);
}, [entityFilter]);
```

---

## Backend Architecture

### Middleware Chain (registration order in `api/src/index.ts`)

1. `cors()` — allow cross-origin requests
2. `express.json()` — parse request bodies
3. `GET /health` — health check, no `/api/` prefix
4. `app.use('/api', routes)` — all resource routes
5. `errorHandler` — **must be last**; converts `AppError` to `{ error: { message, status } }`

### Route Structure

All routes are mounted in `api/src/routes/index.ts` and served under `/api/`:

| Prefix | File | Resource |
|--------|------|----------|
| `/api/entities` | `routes/entities.ts` | Legal entities (personal / business) |
| `/api/asset-locations` | `routes/assetLocations.ts` | Storage locations with coordinates |
| `/api/assets` | `routes/assets.ts` | Assets + nested sub-resources |
| `/api/transfers` | `routes/transfers.ts` | Inter-entity asset transfers |
| `/api/dashboard` | `routes/dashboard.ts` | Aggregated summary, history, recent activity |
| `/api/ledger` | `routes/ledger.ts` | Flattened acquisition rows for cost-basis view |
| `/api/dealers` | `routes/dealers.ts` | Dealer buy prices + scraper refresh |
| `/api/tier-config` | `routes/tierConfig.ts` | Tier allocation targets per entity scope |

**Nested sub-resources** are mounted on the parent router (not on the root router):
- `GET|POST /api/assets/:assetId/acquisitions`
- `PUT|DELETE /api/assets/:assetId/acquisitions/:id`
- `GET|POST|PUT|DELETE /api/assets/:assetId/fiscal-tags`
- `GET|POST /api/assets/:assetId/valuation-snapshots`

### DB Access Pattern

A single `knex` singleton is exported from `api/src/db.ts`. All route files import it directly:

```typescript
import { knex } from '../db';
// Then: knex('table').select(...).where(...)
```

No repository abstraction layer — routes call Knex directly. All monetary columns use `decimal(20,2)` (PostgreSQL `NUMERIC(20,2)`); the pg driver returns these as strings, so `parseFloat()` is required before arithmetic.

### Migration Pattern

Migrations live in `api/migrations/` and run automatically at startup via `runMigrations()` in `api/src/db.ts`. They use `createTableIfNotExists` / `dropTableIfExists` for idempotency. Sequential numbering: `001_initial.ts`, `002_entities.ts`, …, `022_tier_config_entity_scope.ts`.

### Error Propagation

Routes use `try/catch` and call `next(err)`. To send a specific HTTP status, attach `.status` to the Error:

```typescript
const e: any = new Error('Asset not found');
e.status = 404;
throw e;
```

`errorHandler` reads `err.status` (defaults to 500) and returns `{ error: { message, status } }`.

---

## Data Flow

**Typical read request (e.g., Dashboard page load):**

1. `DashboardPage` mounts → `useEffect` fires → calls `api.dashboard.summary(entityId)`
2. `api.ts` `request<DashboardSummary>('/dashboard/summary?entity_id=N')` → `fetch('/api/dashboard/summary?entity_id=N')`
3. Vite proxy (dev) / nginx (prod) forwards to Express on `:3001`
4. Express matches `GET /api/dashboard/summary` → `routes/dashboard.ts` handler
5. Handler queries Knex: aggregates `assets` table, joins `tier_config`, computes tier percentages
6. Handler sends JSON response
7. `request<T>()` returns typed object → `setDashboardData(data)` → React re-renders

**Typical write request (e.g., update asset value):**

1. Component calls `api.assets.update(id, { current_value: '...' })`
2. `PUT /api/assets/:id` → handler wraps in `knex.transaction`
3. Updates `assets` row; if `current_value` changed, auto-inserts a `valuation_snapshots` row
4. Returns updated row → component updates local state

**Navigation:**

1. User clicks sidebar item → `Sidebar` calls `onNavigate(view)` prop
2. `App.tsx` `handleNavigate` persists to `localStorage` and sets `view` state
3. `renderPage()` switch renders new page; old page is unmounted

---

## Key Abstractions

### `View` (navigation state)
- Defined: `frontend/src/components/Sidebar.tsx`
- Re-exported: `frontend/src/layouts/AppShell.tsx`
- Type: `'dashboard' | 'ledger' | 'analytics' | 'locations' | 'tax' | 'entity' | 'tier' | 'dealer'`
- Owned by: `App.tsx` `useState<View>`

### `EntityFilter` (scope selector)
- Defined: `frontend/src/components/TopHeader.tsx`
- Re-exported: `frontend/src/layouts/AppShell.tsx`
- Type: `'personal' | 'business' | 'global'`
- Owned by: `App.tsx` `useState<EntityFilter>`
- Propagated as prop to every page

### `TierConfig` (allocation targets)
- Type: `frontend/src/types.ts` `TierConfig` interface
- DB table: `tier_config`
- Scoped by `entity_scope` (`personal` | `business`) and `tier_id` (0–3)
- Tiers: 0=Grid-Down Baseline, 1=Digital Liquidity, 2=The Vaults, 3=Uncensorable Frontier
- Status computed at read time: `green`/`amber`/`red` based on `min_pct`/`max_pct`

### `AppShell` (layout container)
- File: `frontend/src/layouts/AppShell.tsx`
- Renders: fixed `Sidebar` (left, 256px) + sticky `TopHeader` + scrollable `main` content area
- Purely presentational — no state, no API calls

### `knex` singleton (DB client)
- File: `api/src/db.ts`
- Single Knex instance connecting to PostgreSQL via `DATABASE_URL`
- Migration extension: `.ts` in dev, `.js` in production build

### `request<T>()` (HTTP client)
- File: `frontend/src/api.ts`
- Prepends `/api` to path, sets `Content-Type: application/json`
- Throws `Error(body.error.message)` on non-OK responses
- All named `api.*` methods are typed wrappers around this function

---

## Cross-Cutting Concerns

**Monetary precision:** All money stored as PostgreSQL `NUMERIC(20,2)`. Returned as strings by pg driver. Always use `parseFloat()` before arithmetic; never use `float`/`double` columns for money.

**No auth:** Single-user tool. Backend trusts all requests. No session, no JWT.

**No live prices:** All asset values are manually entered. `DealerPage` fetches dealer buy prices from Holland Gold on demand via `POST /api/dealers/:id/refresh-prices` (scraper in `scraper/`).

**Logging:** `console.log` for info, `console.error` for 500-level errors in `errorHandler`.
