# Architecture Research

**Domain:** Sovereign wealth management dashboard — React + Express + PostgreSQL monorepo
**Researched:** April 9, 2026
**Confidence:** HIGH (architecture fully specified via copilot-instructions + all 6 screens analyzed + PRD reviewed)

## Recommended Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Browser — PWA (localhost:3000)                                              │
│  React 18 + TypeScript + Vite 5 + Tailwind CSS (Midnight Sovereign tokens)  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  App.tsx ── View discriminated union ──► Page Components ──► Shared Layout  │
│  api.ts ── single request() helper ── all fetch calls                       │
│  types.ts ── single source of truth for all shared types                    │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ REST /api/*
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Express API — Node.js + TypeScript (localhost:3001)                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  index.ts ── runMigrations() → app.listen()                                 │
│  db.ts ── Knex singleton                                                    │
│  routes/ ── one file per resource                                           │
│  middleware/errorHandler.ts ── last middleware                               │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ Knex.js queries
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL 16 (Docker container)                                            │
│  data/db/ ── Docker volume (persistent local)                               │
│  migrations/ ── auto-run at API startup                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Navigation Pattern (Discriminated Union — Required)

No React Router. `App.tsx` holds a single `View` discriminated union state:

```typescript
// types.ts
type View =
  | { kind: 'dashboard' }
  | { kind: 'ledger' }
  | { kind: 'analytics' }
  | { kind: 'locations' }
  | { kind: 'tax' }
  | { kind: 'breakdown' };
```

Pages receive `onNavigateToX` callback props. `App.tsx` conditionally renders the active page. All navigation is through these callbacks — pages must not import other pages.

This pattern matches the sidebar HTML across all 6 screens, where each `<a>` link maps directly to a view kind:
- `dashboard` → `global-net-worth-dashboard`
- `ledger` → `transaction-ledger`  
- `analytics` → `performance-analytics`
- `locations` → `asset-locations-inventory`
- `tax` → `tax-compliance-center`
- `breakdown` → `business-vs-personal-breakdown`

### Shared Layout Components

Extracted from all 6 screen HTMLs — identical structure repeated:

```
components/
  layout/
    Sidebar.tsx        — Fixed w-64 aside; wordmark "The Vault" italic Newsreader;
                         gold active state: border-l-2 border-[#e9c349];
                         Transfer Funds CTA at bottom; Security Status + Support links
    TopHeader.tsx      — Sticky h-16 header; bg-[#0b1326]/70 backdrop-blur-xl;
                         search input; Personal/Business/Global nav;
                         Market Connected indicator; notifications bell; avatar
    AppShell.tsx       — Wraps Sidebar + TopHeader + main content area
```

**Sidebar active state (from screens):**
```html
class="flex items-center gap-3 py-3 bg-[#222a3d]/50 text-[#e9c349] 
       font-semibold border-l-2 border-[#e9c349] pl-4"
```

**Top header shared markup (from screens):**
```html
<header class="sticky top-0 z-40 flex items-center justify-between px-8 h-16 
               bg-[#0b1326]/70 backdrop-blur-xl border-b border-[#45464d]/20">
```

### Entity Filter State

The Personal/Business/Global entity toggle appears in:
- Top header nav (inline links on all screens)
- Dashboard hero sub-toggle chips (Combined/Personal/Business)

This filter must live in `App.tsx` or a top-level context — all pages share it. Pass as `currentEntity` prop to all pages.

```typescript
type Entity = 'personal' | 'business' | 'combined';
```

### API Layer

All API calls go through a single `request()` helper in `api.ts`:

```typescript
// api.ts
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, options);
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error.message);
  }
  return res.json();
}

export const api = {
  assets: {
    list: () => request<Asset[]>('/assets'),
    create: (body: CreateAsset) => request('/assets', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Asset>) => request(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: number) => request(`/assets/${id}`, { method: 'DELETE' }),
  },
  // ... one namespace per entity
};
```

---

## Data Model

### Core Entities (derived from all 6 screens)

```sql
-- Entity: Personal or Business legal entity for asset ownership
entities
  id SERIAL PRIMARY KEY
  name TEXT NOT NULL          -- "Sovereign-LLC", "Personal"
  type TEXT NOT NULL          -- 'business' | 'personal'
  created_at TIMESTAMPTZ DEFAULT now()

-- Asset: A wealth-holding instrument
assets
  id SERIAL PRIMARY KEY
  entity_id INT REFERENCES entities(id)
  name TEXT NOT NULL          -- "Alpine Real Estate Fund", "Gold Bullion Reserve"
  asset_class TEXT NOT NULL   -- 'real_estate' | 'equities' | 'metals' | 'crypto' | 'cash' | 'private_equity'
  current_value NUMERIC(20,2) NOT NULL
  currency TEXT NOT NULL DEFAULT 'USD'
  location_id INT REFERENCES asset_locations(id)
  security_class TEXT         -- 'CERTIFIED', 'RESTRICTED', etc.
  audit_frequency TEXT        -- 'Semiannual', 'Annual'
  last_audit_date DATE
  notes TEXT
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()

-- Asset Locations: Jurisdictional custody — drives world map pins
asset_locations
  id SERIAL PRIMARY KEY
  name TEXT NOT NULL          -- "Zurich, CH" / "Singapore, SG"
  country_code CHAR(2) NOT NULL
  custodian TEXT              -- "Swiss Custodian" / "Singapore Vault"
  map_x_pct NUMERIC(5,2)     -- 0–100 pin position on world map (% from left)
  map_y_pct NUMERIC(5,2)     -- 0–100 pin position on world map (% from top)
  created_at TIMESTAMPTZ DEFAULT now()

-- Acquisitions: A batch purchase — drives ledger rows and P&L
acquisitions
  id SERIAL PRIMARY KEY
  asset_id INT REFERENCES assets(id)
  purchase_date DATE NOT NULL
  cost_basis NUMERIC(20,2) NOT NULL
  quantity NUMERIC(20,8)      -- for countable assets (BTC, gold oz)
  description TEXT            -- "Series A Investment - Alpine Properties"
  tax_status TEXT             -- 'taxable' | 'tax_deferred' | 'exempt'
  created_at TIMESTAMPTZ DEFAULT now()

-- Fiscal Tags: Tax categorization for compliance screen
fiscal_tags
  id SERIAL PRIMARY KEY
  asset_id INT REFERENCES assets(id)
  fiscal_year INT NOT NULL
  fiscal_category TEXT        -- "Investment Property", "Personal Holding", "Business Asset"
  jurisdiction TEXT
  notes TEXT
  created_at TIMESTAMPTZ DEFAULT now()

-- Transfers: Cross-entity fund movements (deferred v1.1 but schema should exist)
transfers
  id SERIAL PRIMARY KEY
  from_entity_id INT REFERENCES entities(id)
  to_entity_id INT REFERENCES entities(id)
  amount NUMERIC(20,2) NOT NULL
  transfer_date DATE NOT NULL
  description TEXT
  created_at TIMESTAMPTZ DEFAULT now()
```

### Calculated Values (business logic layer, not stored)

| Value | Calculation | Used In |
|-------|-------------|---------|
| Current unrealized P&L | `asset.current_value - SUM(acquisition.cost_basis)` | Ledger, Analytics |
| ROI % | `(current_value - cost_basis) / cost_basis * 100` | Ledger, Analytics |
| Total net worth | `SUM(asset.current_value) WHERE entity_id = ?` | Dashboard hero |
| Fiscal compliance score | `COUNT tagged assets / COUNT total assets * 100` | Tax screen |
| Asset class allocation % | `asset_class_total / grand_total * 100` | Dashboard donut/list |

---

## Backend Architecture

### Express Routes (one file per resource, nested under `assetsRouter`)

```
api/src/routes/
  index.ts              — mounts all routers at /api/*
  entities.ts           — GET /entities, POST, PATCH /:id, DELETE /:id
  assets.ts             — GET /assets, POST, PATCH /:id, DELETE /:id
                          sub-routes: /assets/:id/acquisitions, /assets/:id/fiscal-tags
  acquisitions.ts       — mounted as sub-router under assetsRouter
  locations.ts          — GET /locations, POST, PATCH /:id, DELETE /:id
  fiscal-tags.ts        — sub-router under assetsRouter
  transfers.ts          — GET /transfers, POST
  import.ts             — POST /import (multipart Excel file upload)
  dashboard.ts          — GET /dashboard/summary (aggregated stats)
  analytics.ts          — GET /analytics/batches (batch-level P&L)
```

### Migrations Pattern

All migrations use `createTableIfNotExists` / `dropTableIfExists`. Auto-run at API startup:

```typescript
// db.ts
export async function runMigrations() {
  await knex.migrate.latest();
}
```

Sequential numbered files:
```
migrations/
  001_create_entities.ts
  002_create_asset_locations.ts
  003_create_assets.ts
  004_create_acquisitions.ts
  005_create_fiscal_tags.ts
  006_create_transfers.ts
```

### Excel Import Architecture

```
POST /api/import
  ├─ multer: receive .xlsx file in memory
  ├─ xlsx.read(buffer): parse to workbook
  ├─ extract sheet as JSON rows
  ├─ validate schema: required columns check
  ├─ transaction: BEGIN
  │   ├─ upsert entities
  │   ├─ upsert locations
  │   ├─ insert assets
  │   └─ insert acquisitions
  └─ COMMIT / ROLLBACK on any error
```

Returns `{ imported: number, errors: string[] }` for client display.

---

## Component Architecture

### Page-Level Component Structure (derived from screen layouts)

```typescript
// Each page follows this structure (from screen HTML analysis)
export default function TransactionLedger({ entity, onNavigate }) {
  return (
    <AppShell currentView="ledger" entity={entity}>
      {/* page header: font-headline text-5xl */}
      <PageHeader title="Acquisition Ledger" subtitle="...">
        <button>Export Ledger</button>
      </PageHeader>
      
      {/* filter bar: bg-surface-container-low rounded-xl */}
      <FilterBar>
        <Select name="taxStatus" />
        <Select name="assetClass" />
      </FilterBar>
      
      {/* data table: divide-y divide-outline-variant/10 */}
      <DataTable columns={columns} data={acquisitions} />
    </AppShell>
  );
}
```

### Reusable UI Components

| Component | Source Screen | Implementation Notes |
|-----------|--------------|---------------------|
| `GlassPanel` | All screens | `background: rgba(34,42,61,0.7); backdrop-filter: blur(24px)` |
| `GoldGradientButton` | All screens (sidebar CTA) | `background: linear-gradient(135deg, #e9c349 0%, #9d7d00 100%)` |
| `StatusChip` | Ledger, Locations, Tax | `rounded-full bg-X-container/20 text-X border border-X/20` |
| `DataTable` | Ledger, Locations, Analytics, Tax | `divide-y divide-outline-variant/10`; no solid borders |
| `FilterBar` | Ledger, Locations, Analytics | `bg-surface-container-low rounded-xl p-4` |
| `EntityBadge` | Business/Personal | `bg-primary/10 text-primary rounded-full border border-primary/20` |
| `AtmosphericSpotlight` | Business/Personal | `w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]` |
| `MarketTicker` | Analytics | Animated marquee scrolling bar; horizontal auto-scroll |
| `WorldMapPin` | Locations | `w-4 h-4 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(233,195,73,0.8)]` |
| `SparklineBar` | Dashboard | Flex row of `<div>` bars with `bg-primary/20`, last bar `bg-primary` |

---

## File Structure

```
precious_dashboard/
├── api/
│   ├── src/
│   │   ├── index.ts              # app setup + runMigrations() + listen
│   │   ├── db.ts                 # Knex singleton + runMigrations export
│   │   ├── routes/
│   │   │   ├── index.ts          # mount all routers at /api/*
│   │   │   ├── entities.ts
│   │   │   ├── assets.ts         # includes mounted sub-routes
│   │   │   ├── acquisitions.ts
│   │   │   ├── locations.ts
│   │   │   ├── fiscal-tags.ts
│   │   │   ├── transfers.ts
│   │   │   ├── import.ts
│   │   │   ├── dashboard.ts
│   │   │   └── analytics.ts
│   │   └── middleware/
│   │       └── errorHandler.ts   # { error: { message, status } } shape
│   ├── migrations/
│   │   ├── 001_create_entities.ts
│   │   ├── 002_create_asset_locations.ts
│   │   ├── 003_create_assets.ts
│   │   ├── 004_create_acquisitions.ts
│   │   ├── 005_create_fiscal_tags.ts
│   │   └── 006_create_transfers.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # View discriminated union + entity toggle state
│   │   ├── api.ts                # ALL fetch calls via request() helper
│   │   ├── types.ts              # ALL shared types
│   │   ├── index.css             # Tailwind directives + global utilities
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopHeader.tsx
│   │   │   │   └── AppShell.tsx
│   │   │   └── ui/
│   │   │       ├── GlassPanel.tsx
│   │   │       ├── StatusChip.tsx
│   │   │       ├── DataTable.tsx
│   │   │       ├── FilterBar.tsx
│   │   │       ├── EntityBadge.tsx
│   │   │       ├── SparklineBar.tsx
│   │   │       ├── WorldMapPin.tsx
│   │   │       ├── MarketTicker.tsx
│   │   │       └── AtmosphericSpotlight.tsx
│   │   └── pages/
│   │       ├── Dashboard.tsx
│   │       ├── TransactionLedger.tsx
│   │       ├── PerformanceAnalytics.tsx
│   │       ├── AssetLocations.tsx
│   │       ├── TaxCompliance.tsx
│   │       └── BusinessPersonalBreakdown.tsx
│   ├── public/
│   │   └── manifest.webmanifest  # PWA manifest
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts        # Midnight Sovereign tokens
│   └── tsconfig.json
├── data/
│   ├── db/                       # Docker volume mount (PostgreSQL data)
│   └── import/                   # Drop-zone for Excel files (optional)
├── docker-compose.yml
├── Makefile
└── .planning/
```

---

## Docker Compose Architecture

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    volumes:
      - ./data/db:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: precious
      POSTGRES_USER: precious
      POSTGRES_PASSWORD: precious

  api:
    build: ./api
    ports:
      - "3001:3001"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgres://precious:precious@db:5432/precious
    volumes:
      - ./api:/app             # dev hot-reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - api
    volumes:
      - ./frontend:/app        # dev hot-reload
```

---

## Sources

- `.stitch/screens/*.html` — all 6 screens; actual markup extracted for layout, component, and class patterns
- `.stitch/design-system/midnight-sovereign.json` — token values
- `.stitch/design-system/DESIGN_SYSTEM.md` — design philosophy
- `.github/copilot-instructions.md` — architecture constraints (required patterns)
- `PRD.md` — stack specification and data model outline

---
*Architecture research for: Precious Dashboard*
*Researched: April 9, 2026*
