# Structure
_Last updated: 2026-04-18_

## Overview

The project is a Docker Compose monorepo with two application services (`frontend/`, `api/`) plus a Python scraper (`scraper/`) and a data volume directory (`data/`). The frontend and API each have their own `package.json` and TypeScript config. There is no shared package or workspace linking between them.

---

## Directory Layout

```
precious_dashboard/
├── Makefile                        # Dev/prod commands: make dev, make up, make down, make clean
├── docker-compose.yml              # Full-stack orchestration (frontend :3000, api :3001, postgres :5432)
├── package.json                    # Root — minimal, no workspace linking
├── FEATURES.md                     # Feature tracking document
├── README.md
│
├── api/                            # Express REST API (Node.js + TypeScript)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                # Express app entry: cors → json → /health → /api routes → errorHandler
│   │   ├── db.ts                   # Knex singleton + runMigrations()
│   │   ├── seed.ts                 # Optional seed script
│   │   ├── routes/
│   │   │   ├── index.ts            # Aggregates all sub-routers, mounts under /api/
│   │   │   ├── assets.ts           # /api/assets + nested acquisitions, fiscal-tags, snapshots
│   │   │   ├── assetLocations.ts   # /api/asset-locations
│   │   │   ├── entities.ts         # /api/entities
│   │   │   ├── transfers.ts        # /api/transfers
│   │   │   ├── dashboard.ts        # /api/dashboard (summary, history, recalculate, recent-activity)
│   │   │   ├── ledger.ts           # /api/ledger
│   │   │   ├── dealers.ts          # /api/dealers + /refresh-prices scraper integration
│   │   │   └── tierConfig.ts       # /api/tier-config
│   │   └── middleware/
│   │       └── errorHandler.ts     # Centralized error handler — registered LAST in index.ts
│   └── migrations/                 # Sequential Knex migrations (auto-run at startup)
│       ├── 001_initial.ts
│       ├── 002_entities.ts
│       ├── 003_asset_locations.ts
│       ├── 004_assets.ts
│       ├── 005_acquisitions.ts
│       ├── 006_fiscal_tags.ts
│       ├── 007_transfers.ts
│       ├── 008_valuation_snapshots.ts
│       ├── 009_asset_subclass.ts
│       ├── 010_dealers.ts
│       ├── 011_tier_system.ts
│       ├── 012_dealer_metal_prices.ts
│       ├── 013_hollandgold_seed.ts
│       ├── 014_hollandgold_seed.ts
│       ├── 015_asset_brand.ts
│       ├── 016_hollandgold_prices_update.ts
│       ├── 017_backfill_asset_weights.ts
│       ├── 018_location_coordinates.ts
│       ├── 019_backfill_snapshots.ts
│       ├── 020_location_insurance.ts
│       ├── 021_dealer_bar_prices.ts
│       └── 022_tier_config_entity_scope.ts
│
├── frontend/                       # React 18 SPA (TypeScript + Vite)
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── public/
│   │   └── world-atlas.json        # GeoJSON used by LocationsPage map
│   └── src/
│       ├── main.tsx                # React entry point — renders <App /> into #root
│       ├── App.tsx                 # Root component: View + EntityFilter state, renderPage() switch
│       ├── api.ts                  # ALL fetch calls — api.* methods, single request<T>() helper
│       ├── types.ts                # ALL shared types — single source of truth
│       ├── index.css               # Global styles + Tailwind directives
│       ├── react-simple-maps.d.ts  # Type shim for react-simple-maps
│       ├── layouts/
│       │   └── AppShell.tsx        # Shell: Sidebar + TopHeader + main content; re-exports View, EntityFilter
│       ├── components/
│       │   ├── Sidebar.tsx         # Fixed left nav, defines View type, NAV_ITEMS
│       │   ├── TopHeader.tsx       # Sticky header, defines EntityFilter type, entity toggle
│       │   ├── ImportWizard.tsx    # CSV import flow component
│       │   └── modals/
│       │       ├── Modal.tsx           # Base modal wrapper
│       │       ├── AssetModal.tsx      # Create/edit asset form
│       │       ├── AcquisitionModal.tsx# Create/edit acquisition form
│       │       ├── EntityModal.tsx     # Create/edit entity form
│       │       ├── DealerManagementModal.tsx
│       │       └── FormFields.tsx      # Shared form field components
│       ├── pages/
│       │   ├── DashboardPage.tsx   # Global net worth, tier summary, recent activity, asset list
│       │   ├── LedgerPage.tsx      # Acquisition ledger with cost basis, ROI, import wizard
│       │   ├── AnalyticsPage.tsx   # Performance analytics, allocation charts, benchmark
│       │   ├── LocationsPage.tsx   # World map + storage location inventory
│       │   ├── TaxPage.tsx         # Tax & compliance view, fiscal tags
│       │   ├── EntityPage.tsx      # Business vs. personal breakdown
│       │   ├── TierPage.tsx        # Tier system config, allocation targets, presets
│       │   └── DealerPage.tsx      # Dealer buy prices, price refresh
│       └── utils/
│           └── metalPricing.ts     # Dealer rate lookup, weight unit conversion (toGrams, getDealerRate)
│
├── scraper/                        # Python price scraper (Holland Gold)
│   ├── main.py
│   ├── scraper.py
│   └── requirements.txt
│
└── data/
    ├── db/                         # PostgreSQL data volume mount
    └── import/                     # CSV import staging area
        ├── hollandgold-beheer.csv
        └── sample-import.csv
```

---

## Key File Locations

| Purpose | File |
|---------|------|
| Express entry point | `api/src/index.ts` |
| DB client + migrations runner | `api/src/db.ts` |
| Route aggregator | `api/src/routes/index.ts` |
| Centralized error handler | `api/src/middleware/errorHandler.ts` |
| React root | `frontend/src/main.tsx` |
| Navigation + entity state owner | `frontend/src/App.tsx` |
| All API calls | `frontend/src/api.ts` |
| All shared types | `frontend/src/types.ts` |
| Layout shell | `frontend/src/layouts/AppShell.tsx` |
| Sidebar + `View` type | `frontend/src/components/Sidebar.tsx` |
| TopHeader + `EntityFilter` type | `frontend/src/components/TopHeader.tsx` |
| Metal pricing utilities | `frontend/src/utils/metalPricing.ts` |

---

## Naming Conventions

**API route files:** kebab-case matching the URL prefix — `assetLocations.ts` → `/api/asset-locations`

**Frontend page components:** PascalCase with `Page` suffix — `DashboardPage.tsx`, `TierPage.tsx`

**Frontend modal components:** PascalCase with `Modal` suffix — `AssetModal.tsx`, `AcquisitionModal.tsx`

**Shared components:** PascalCase, no suffix — `Sidebar.tsx`, `TopHeader.tsx`, `ImportWizard.tsx`

**Utility files:** camelCase — `metalPricing.ts`

**Migration files:** `NNN_description.ts`, zero-padded 3 digits, sequential — `001_initial.ts`, `022_tier_config_entity_scope.ts`

**Types:** PascalCase interfaces/types in `types.ts`. Input variants use `Create` prefix or `Omit<T>` / `Partial<T>` — never duplicate fields.

---

## Where to Add New Code

### New page
1. Add value to `View` union in `frontend/src/components/Sidebar.tsx`
2. Add entry to `NAV_ITEMS` array in `frontend/src/components/Sidebar.tsx`
3. Add case to `renderPage()` in `frontend/src/App.tsx`
4. Create `frontend/src/pages/NewPage.tsx`
5. Page props: receive `entityFilter: EntityFilter` and `onNavigate: (view: View) => void` if needed

### New API endpoint
1. If new resource: create `api/src/routes/newResource.ts`
2. Mount it in `api/src/routes/index.ts`: `router.use('/new-resource', newResourceRouter)`
3. If sub-resource of an existing one: add to the parent router file (e.g., `assets.ts`)
4. Add types to `frontend/src/types.ts`
5. Add methods to `frontend/src/api.ts`

### New database table
1. Create `api/migrations/NNN_description.ts` (next sequential number)
2. Use `createTableIfNotExists` / `dropTableIfExists`
3. Monetary columns: `table.decimal('column_name', 20, 2)` — never `float`
4. Migration runs automatically on next API startup

### New shared type
- Add to `frontend/src/types.ts`
- Use `Omit<T, ...>` or `Pick<T, ...>` for input variants rather than new interfaces with duplicated fields

### New modal
- Create in `frontend/src/components/modals/`
- Use `Modal.tsx` as the base wrapper
- Shared form fields go in `FormFields.tsx`

---

## Special Directories

**`data/db/`** — PostgreSQL container data volume. Generated, not committed. Wiped by `make clean`.

**`data/import/`** — Staging area for bulk CSV imports. Contains sample files for the import wizard.

**`api/migrations/`** — All 22 migrations are committed. They are idempotent and run automatically on every API startup.

**`.planning/`** — GSD planning artifacts (phases, codebase maps). Committed but not deployed.

**`.github/`** — Copilot instructions, skills, and coding standards. Not deployed.
