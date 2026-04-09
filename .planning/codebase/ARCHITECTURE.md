# ARCHITECTURE.md — System Architecture

## Status: Pre-Implementation

No application code exists. Architecture below is **specified** in `.github/copilot-instructions.md` and `PRD.md`. Implementation has not begun.

---

## Architectural Pattern

**Layered monolith with API-separated frontend**

```
Browser (React PWA)
     │
     │  HTTP/JSON (fetch via api.ts helper)
     ▼
Express REST API (Node.js + TypeScript)
     │
     │  Knex.js query builder
     ▼
PostgreSQL 16
```

Single-user, no auth, fully local. No microservices, no event bus, no message queue.

---

## Layers

### 1. Frontend — React 18 + TypeScript + Vite 5

**State management:** Custom state-based navigation via discriminated union `View` in `App.tsx`. No React Router, no Redux.

**Navigation model:**
```typescript
// App.tsx holds a discriminated union View state
type View = 
  | { page: 'dashboard' }
  | { page: 'ledger' }
  | { page: 'analytics' }
  | { page: 'assets' }
  | { page: 'tax' }
  | { page: 'business-personal' }

// Pages receive onNavigateToX callbacks as props
// Pages NEVER import other pages
```

**API layer:** All fetch calls go through a single `request()` helper in `frontend/src/api.ts`. No inline `fetch()` in components.

**Type sharing:** All shared types defined in `frontend/src/types.ts`. Single source of truth.

### 2. API — Node.js + Express + TypeScript

**Entry point:** `api/src/index.ts` — initializes Express, runs migrations on startup, then listens.

**Route structure:** One file per resource in `api/src/routes/`. Nested resources are sub-routes on their parent router (e.g., asset scores and mitigations are sub-routes of `assetsRouter`).

**Error handling:** Centralized in `api/src/middleware/errorHandler.ts`. Error shape: `{ error: { message: string, status: number } }`. Must be the last middleware.

**Database:** Knex singleton in `api/src/db.ts`, which also exports `runMigrations()`.

### 3. Database — PostgreSQL 16

**Migration strategy:** Sequential numbered files in `api/migrations/`. Auto-run at API startup via `runMigrations()`. Always use `createTableIfNotExists` / `dropTableIfExists`.

---

## Planned Data Model (PRD Section 6.1)

| Entity | Description |
|--------|-------------|
| `Asset` | Physical or financial holding — class, custodian, location, legal entity, specs |
| `Acquisition` | Purchase event — date, cost basis, quantity, legal entity |
| `Location` | Physical custody site — country, custodian, security class, audit config |
| `Entity` | Legal ownership entity — personal or corporate (e.g. Sovereign-LLC) |
| `FiscalTag` | Asset classification for tax reporting |
| `PriceFeed` | Live market price per asset type (deferred v1) |
| `Transfer` | Cross-entity internal transaction log |

---

## Score System (Carried Over from Existing Convention)

From `.github/copilot-instructions.md`:
- 5-point enum scale: 1–5 → Extra Low / Low / Medium / High / Critical
- Scores stored as integers; labels derived in frontend via `SCORE_LABELS[score - 1]`
- Assets carry gross/net scores + mitigations
- Capital-weighted portfolio scoring

---

## Key Architecture Rules (from copilot-instructions.md)

1. **No React Router** — discriminated union state + conditional rendering only
2. **No inline fetch** — always use `api.*` methods
3. **All types in `frontend/src/types.ts`** — no duplication, use `Pick<T>` / `Partial<T>`
4. **All routes prefixed `/api/`** except `/health`
5. **Nested routes inside parent router** — never mount at top level
6. **Migrations auto-run** — never invoke manually during dev

---

## Docker Compose Architecture

```
┌─────────────────────────────────────┐
│  docker-compose.yml                 │
│                                     │
│  frontend  (:3000) ◄── Vite HMR     │
│  api       (:3001) ◄── ts-node-dev  │
│  postgres  (:5432) ◄── data/db/     │
└─────────────────────────────────────┘
```

All services started with `make dev`. Volume mounts under `data/db/` for PostgreSQL persistence.

---

## Six Screens (Visual Architecture)

Each screen is a full-page view component in `frontend/src/pages/`:

| Screen | Page Component | Primary Data |
|--------|---------------|-------------|
| Global Net Worth Dashboard | `DashboardPage` | All entities aggregate |
| Transaction Ledger | `LedgerPage` | Acquisitions |
| Performance & Analytics | `AnalyticsPage` | Acquisitions + PriceFeed |
| Asset Locations & Inventory | `AssetsPage` | Assets + Locations |
| Tax & Compliance Center | `TaxPage` | Assets + FiscalTags |
| Business vs. Personal Breakdown | `BusinessPersonalPage` | Entities + Assets |

---

## Entity/View Toggle (Global Pattern)

All screens respond to an entity filter: `Personal | Business | Combined`.
This toggle is persistent across screens — likely held in top-level `App.tsx` state and passed down.
