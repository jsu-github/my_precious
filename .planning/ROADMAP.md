# Roadmap: Precious Dashboard

## Milestones

- ✅ **v1.0 MVP** — Phases 1–12 (shipped 2026-04-10) — see [.planning/milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- 📋 **v1.1** — TBD

---

## Current Milestone: v1.1 — Market Intelligence & Sovereign Tier System

**Goal:** Add manually-maintained dealer buy prices for gold and a 4-tier sovereign portfolio risk allocation system with configurable target/min/max bounds and visual status indicators.

**Phases 13–16** — see Phase Details below.

---

## Archived Milestones

<details>
<summary>✅ v1.0 MVP — Phases 1–12 — SHIPPED 2026-04-10</summary>

- [x] Phase 1: Foundation (5/5 plans) — Docker + PostgreSQL + API skeleton + migrations
- [x] Phase 2: Data Model & API (5/5 plans) — 7 tables, full CRUD, TypeScript types, api.ts
- [x] Phase 3: App Shell (3/3 plans) — Midnight Sovereign tokens, Sidebar, TopHeader, nav
- [x] Phase 4: Dashboard (1/1 plan) — Net worth hero, asset allocation, vault security
- [x] Phase 5: Transaction Ledger — Acquisition table, filters, P&L summary, CSV export
- [x] Phase 6: Performance Analytics — Batch-level P&L table, market ticker bar
- [x] Phase 7: Asset Locations — World map with gold pulse pins, inventory table
- [x] Phase 8: Tax & Compliance — Fiscal tagging, compliance score, report export
- [x] Phase 9: Business vs. Personal — Dual-column entity comparison layout
- [x] Phase 10: Data Entry Forms — Add/edit/delete modals for all entities
- [x] Phase 11: Excel Import — SheetJS 4-step wizard, column mapping, atomic transaction
- [x] Phase 12: PWA & Polish — Service worker, manifest, self-hosted fonts

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

## Phases

- [x] **Phase 1: Foundation** - Docker Compose + PostgreSQL + API skeleton + auto-running migrations
- [x] **Phase 2: Data Model & API** - All 6 entity schemas, full CRUD endpoints, TypeScript types + api.ts
- [x] **Phase 3: App Shell** - React scaffold + Midnight Sovereign Tailwind tokens + AppShell + discriminated-union navigation
- [x] **Phase 4: Dashboard** - Global net worth hero + asset allocation + vault security panel
- [x] **Phase 5: Transaction Ledger** - Acquisition table + filters + P&L summary + CSV export
- [x] **Phase 6: Performance Analytics** - Batch-level P&L table + market ticker bar
- [x] **Phase 7: Asset Locations** - Jurisdictional world map + dynamic pins + inventory table
- [x] **Phase 8: Tax & Compliance** - Fiscal tagging + compliance score + report/VAT export
- [x] **Phase 9: Business vs. Personal** - Dual-column entity comparison layout
- [ ] **Phase 10: Data Entry Forms** - Add/edit/delete modals for all entities
- [x] **Phase 11: Excel Import** - File upload + SheetJS column mapping + validated bulk insert
- [x] **Phase 12: PWA & Polish** - Service worker + manifest + self-hosted fonts + Lighthouse pass
- [ ] **Phase 13: Data Foundation** - DB migrations (dealers + weight + tier + tier_config), TypeScript types, and api.ts namespaces — technical foundation for all v1.1 features
- [ ] **Phase 14: Dealer Price Management** - Dealer CRUD + weight field in AssetModal + Ledger liquidation value column with active-dealer selector
- [ ] **Phase 15: Sovereign Tier System** - Tier assignment in AssetModal + crypto asset support + tier_config CRUD + dedicated TierPage with allocation vs target and status indicators
- [ ] **Phase 16: Dashboard Health Tile** - Extend dashboard summary API + add Tier health glass-panel tile to DashboardPage

## Phase Details

### Phase 1: Foundation
**Goal**: Developer can start the full stack with `make dev` and the API responds to `/health` — PostgreSQL is running, all migration files auto-execute on startup, and `make clean` fully resets the environment
**Depends on**: Nothing
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. `make dev` starts all three containers (frontend :3000, API :3001, PostgreSQL :5432) without errors
  2. `make clean` stops all containers and removes volumes; subsequent `make dev` starts fresh
  3. `GET http://localhost:3001/health` returns 200 JSON
  4. API console logs confirm migrations complete on startup — no manual `make migrate` required in dev
  5. All monetary DB columns established as `NUMERIC(20, 2)` — enforced as a migration convention from the first schema file
  6. API error responses use `{ error: { message: string, status: number } }` shape
**Plans**: 5 plans complete ✓
Plans:
- [x] 01-01-PLAN.md — API package layer (Express + Knex + pg)
- [x] 01-02-PLAN.md — Frontend package layer (React + Vite + TypeScript)
- [x] 01-03-PLAN.md — API server (index.ts + errorHandler + routes + migration)
- [x] 01-04-PLAN.md — Docker Compose + Makefile + React source stubs
- [x] 01-05-PLAN.md — Integration checkpoint (verified ✓)

### Phase 2: Data Model & API
**Goal**: All six data entities are persisted in PostgreSQL with full CRUD REST endpoints — TypeScript types and `api.ts` helper methods are ready for frontend screen development
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10
**Success Criteria** (what must be TRUE):
  1. Migrations create all tables: `entities`, `assets`, `asset_locations`, `acquisitions`, `fiscal_tags`, `transfers`, `valuation_snapshots` — all money columns are `NUMERIC(20,2)`
  2. All CRUD routes respond correctly: e.g. `GET /api/assets` returns JSON array, `POST /api/assets` creates a record, `POST /api/assets/:id/acquisitions` creates a nested acquisition
  3. All eight asset class values (`precious_metals`, `real_estate`, `equities`, `crypto`, `private_equity`, `fixed_income`, `cash`, `exotics`) are stored and returned as typed enums
  4. `frontend/src/types.ts` defines interfaces for all 6 entities matching the DB schema
  5. `frontend/src/api.ts` exposes typed helper methods for every resource — no endpoint requires an inline `fetch()` in a component
  6. Seed data is loadable and returns meaningful values from all endpoints
**Plans**: 5 plans complete ✓
Plans:
- [x] 02-01-PLAN.md — DB Migrations (7 tables: entities, asset_locations, assets, acquisitions, fiscal_tags, transfers, valuation_snapshots)
- [x] 02-02-PLAN.md — TypeScript types (all entity interfaces + enums + input types)
- [x] 02-03-PLAN.md — Simple routes: entities, assetLocations, transfers
- [x] 02-04-PLAN.md — Assets route complex (CRUD + nested acquisitions/fiscal-tags/snapshots)
- [x] 02-05-PLAN.md — Wiring + routes/index.ts + dashboard.ts + frontend api.ts + seed data

### Phase 3: App Shell
**Goal**: The React app renders the complete Midnight Sovereign visual chrome — Sidebar, TopHeader, and discriminated-union navigation work across all 6 named routes (pages show placeholder content)
**Depends on**: Phase 2
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, DS-01, DS-02, DS-03, DS-04, DS-05, DS-06
**Success Criteria** (what must be TRUE):
  1. All Midnight Sovereign tokens from `midnight-sovereign.json` are wired into `tailwind.config.ts` — no CDN; gold text `#e9c349` renders correctly in the built app
  2. Fixed sidebar (`w-64`) shows "The Vault" Newsreader italic wordmark, 6 navigation links, Transfer Funds CTA, and footer links
  3. Active nav link highlights with gold text, left gold border (`border-l-2 border-[#e9c349]`), and subtle background (`bg-[#222a3d]/50`)
  4. Sticky top header (`h-16`, `bg-[#0b1326]/70 backdrop-blur-xl`) shows entity tabs (Personal / Business / Global), search, Market Connected status, and user avatar
  5. Clicking each nav link renders the correct page component; `App.tsx` uses a discriminated union `View` type — no React Router import anywhere
  6. Entity toggle state in `App.tsx` updates the active tab in the header and propagates to all page props
  7. `.glass-panel`, `.gold-gradient`, and `tabular-nums` CSS utilities are defined in global styles
**Plans**: 3 plans complete ✓
Plans:
- [x] 03-01-PLAN.md — Tailwind CSS + Design System Foundation (tokens, fonts, PostCSS)
- [x] 03-02-PLAN.md — App Shell components (Sidebar, TopHeader, AppShell, 6 page stubs)
- [x] 03-03-PLAN.md — App.tsx View union + EntityFilter wiring

### Phase 4: Dashboard
**Goal**: The Dashboard screen displays live totals from the API — net worth hero with glassmorphism panel, asset allocation breakdown, and vault security status — and responds to the entity toggle
**Depends on**: Phase 3
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. Net worth hero shows total portfolio valuation in `font-headline` large text with trend indicator (+/- % since last period)
  2. Hero card uses glassmorphism: `background: rgba(34,42,61,0.7); backdrop-filter: blur(24px)`
  3. Switching entity toggle to Personal / Business / Combined recalculates the hero total from API data
  4. Asset allocation panel shows percentage per class with color-coded indicators (Real Estate, Equities, Metals, Crypto, etc.)
  5. Vault Security Status panel shows custodian connectivity and last-audit timestamp
**Plans**: TBD
**UI hint**: yes

### Phase 5: Transaction Ledger
**Goal**: The Ledger screen displays all acquisition records in a filterable table with P&L summary row and one-click CSV export
**Depends on**: Phase 3
**Requirements**: LEDG-01, LEDG-02, LEDG-03, LEDG-04, LEDG-05, LEDG-06, LEDG-07, LEDG-08
**Success Criteria** (what must be TRUE):
  1. Ledger table shows all acquisition records with columns: Purchase Date, Asset Description, Cost Basis, Current Value, Net ROI ($ + %), Audit Status chip
  2. Row separation uses `divide-y divide-outline-variant/10` — no 1px solid borders anywhere in the table
  3. All monetary columns render with `tabular-nums` — column widths stay fixed as values change
  4. Filter bar with Tax Status and Asset Class dropdowns filters visible rows; entity toggle also filters
  5. Summary bar shows correct total Cost Basis and Net Unrealized ROI across all visible rows
  6. "Export CSV" button downloads an audit-ready CSV file
  7. Audit Status chips use correct color scheme: Settled = `bg-secondary-container/20 border-secondary/20`; Pending = `border-error/20 text-error`
**Plans**: TBD
**UI hint**: yes

### Phase 6: Performance Analytics
**Goal**: The Analytics screen shows a horizontally-scrolling market ticker at the top and a batch-level P&L table with ROI metrics and locked-asset indicators
**Depends on**: Phase 3
**Requirements**: ANAL-01, ANAL-02, ANAL-03, ANAL-04, ANAL-05
**Success Criteria** (what must be TRUE):
  1. Horizontal market ticker bar at page top shows manually-entered spot values for XAU, XAG, BTC, S&P 500 — positive values in secondary (emerald), negative in error (red)
  2. Batch-level table shows: Asset/Batch Name, Acquisition Date, Cost Basis, Current Value, P&L (absolute), ROI (%), Alpha vs benchmark
  3. Private equity / locked assets display a `LOCKED` status badge in the table
  4. Entity toggle filters the analytics table to the selected entity's batches
  5. All financial figures in the table use `tabular-nums` / `text-tnum`
**Plans**: TBD
**UI hint**: yes

### Phase 7: Asset Locations & Inventory
**Goal**: The Locations screen shows a world map with dynamically-positioned gold pulse pins driven by DB coordinates, a custody inventory table, and a working Location CRUD flow
**Depends on**: Phase 3
**Requirements**: LOC-01, LOC-02, LOC-03, LOC-04, LOC-05, LOC-06
**Success Criteria** (what must be TRUE):
  1. World map panel (`h-[500px]`) renders with greyscale base image and gold pulse pins positioned from `map_x_pct` / `map_y_pct` DB values
  2. Map pins use `w-4 h-4 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(233,195,73,0.8)]` styling
  3. Hovering a pin shows a `.glass-panel` tooltip with custodian name and location details
  4. Inventory table shows: Location/Asset, Spec/Quantity, Current Valuation, Audit Frequency, Audit Status chip, Security Class
  5. Audit Status chips: `CERTIFIED` = secondary color; `Audit Pending` = error color
  6. User can add a new Asset Location via a form (sets custodian name + map pin x/y coords); saved location pin appears on map
**Plans**: TBD
**UI hint**: yes

### Phase 8: Tax & Compliance
**Goal**: The Tax & Compliance screen shows asset fiscal categorization with a live compliance score and produces downloadable fiscal/VAT export files
**Depends on**: Phase 3
**Requirements**: TAX-01, TAX-02, TAX-03, TAX-04, TAX-05, TAX-06
**Success Criteria** (what must be TRUE):
  1. Page header shows both "Generate Fiscal Report" and "Export VAT Documentation" buttons
  2. Asset table shows: Asset Name, Current Valuation, Legal Entity, Fiscal Category, Actions
  3. User can assign or change a Fiscal Tag (fiscal year, category label, jurisdiction) per asset; change persists after page reload
  4. Compliance Score percentage reflects what fraction of assets have been tagged for the current fiscal year; updates in real time as tags are added
  5. "Generate Fiscal Report" produces a downloadable CSV ready for tax filing
  6. Entity toggle filters the tax table to selected entity's assets
**Plans**: TBD
**UI hint**: yes

### Phase 9: Business vs. Personal
**Goal**: The Business vs. Personal screen delivers a side-by-side dual-column entity comparison with sync status indicator and atmospheric depth styling — all metrics driven by live API data
**Depends on**: Phase 3
**Requirements**: BVP-01, BVP-02, BVP-03, BVP-04, BVP-05, BVP-06
**Success Criteria** (what must be TRUE):
  1. Page renders a `grid-cols-1 lg:grid-cols-2` dual-column layout with Business (Sovereign-LLC) left and Personal right, each with independent subtotals
  2. Atmospheric spotlight glow (`w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]`) renders top-left without impacting table performance
  3. Sync status panel shows "Protocol Active" and "Last Sync: Xm ago" with a sync icon in an outlined panel
  4. Entity badges use `px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20` styling
  5. Each column shows total valuation and asset class breakdown sourced from live API data
  6. Entity toggle reshapes the view (Business-only / Personal-only / Consolidated)
**Plans**: TBD
**UI hint**: yes

### Phase 10: Data Entry Forms
**Goal**: User can create, edit, and delete Assets, Acquisitions, Locations, and Fiscal Tags through in-app modals — no database access required for ongoing data management
**Depends on**: Phase 9
**Requirements**: CRUD-01, CRUD-02, CRUD-03, CRUD-04, CRUD-05, CRUD-06, CRUD-07
**Success Criteria** (what must be TRUE):
  1. "Add Asset" opens a modal with all required fields; saving creates the asset and it appears live in the applicable screen
  2. Editing an asset's `current_value` saves successfully and creates a `valuation_snapshot` record in the DB
  3. Deleting an asset shows a confirmation prompt; deletion cascades to linked acquisitions and fiscal tags
  4. User can add, edit, and delete Acquisitions — accessible from the Ledger screen
  5. User can set map pin coordinates (x/y % fields) when adding/editing Asset Locations from the Locations screen
  6. User can create and update Fiscal Tags per asset from the Tax & Compliance screen
**Plans**: TBD
**UI hint**: yes

### Phase 11: Excel Import
**Goal**: User can upload an Excel file, interactively map its columns to the import schema, and bulk-load all asset/acquisition data in a single atomic transaction
**Depends on**: Phase 10
**Requirements**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05
**Success Criteria** (what must be TRUE):
  1. File upload UI accepts `.xlsx` and `.xls` files; invalid file types are rejected immediately with a clear error
  2. After upload, a column-mapping UI shows detected Excel headers alongside target fields (Asset Name, Asset Class, Entity, Acquisition Date, Cost Basis, Quantity) — user maps each column before import
  3. Import validates all required fields before inserting; per-row errors are displayed in a results panel
  4. Successful import shows `{ imported: N, errors: [...] }` summary
  5. Import runs inside a DB transaction — any failure rolls back entirely; no partial inserts
**Plans**: TBD
**UI hint**: yes

### Phase 12: PWA & Polish
**Goal**: The app is installable as a PWA from the browser, all fonts are self-hosted, and a Lighthouse PWA audit passes
**Depends on**: Phase 11
**Requirements**: INFRA-04
**Success Criteria** (what must be TRUE):
  1. Chrome/Edge shows an "Install" prompt; the installed app opens standalone (no browser chrome)
  2. `manifest.webmanifest` includes name, short_name, start_url, icons, and `theme_color: "#0b1326"`
  3. Newsreader and Inter fonts are served from `frontend/public/fonts/` — no Google Fonts CDN call in production
  4. A service worker caches the app shell for offline availability
  5. Lighthouse PWA audit passes all installability checks
**Plans**: TBD
**UI hint**: yes

### Phase 13: Data Foundation
**Goal**: All new DB schema for v1.1 is deployed, TypeScript types are extended, and API route stubs are wired — any v1.1 endpoint is callable before UI work begins in Phase 14
**Depends on**: Phase 12
**Requirements**: (none standalone — this phase is technical infrastructure that enables Phases 14–16)
**Notes**:
  - Migration 010: `dealers` table (`id`, `name`, `contact_notes TEXT`, `we_buy_gold_per_gram NUMERIC(10,4) NULL`, `updated_at`)
  - Migration 011: `ALTER TABLE assets ADD COLUMN IF NOT EXISTS weight_per_unit_grams NUMERIC(10,4)` + `ALTER TABLE assets ADD COLUMN IF NOT EXISTS tier INT NULL` + `CREATE TABLE tier_config` with 4 seed rows seeded in `up()` using `ON CONFLICT DO NOTHING` — default bounds: (0, 2, 0, 5), (1, 8, 4, 12), (2, 70, 60, 80), (3, 20, 10, 30)
  - `types.ts`: add `Dealer` + `TierConfig` interfaces; extend `Asset` with `tier: number | null` and `weight_per_unit_grams: string | null`; add `'tier'` to `View` union
  - `api.ts`: add `api.dealers.*` and `api.tierConfig.*` namespaces **before** any component uses them
  - `routes/index.ts`: mount dealers and tierConfig routers immediately after creating the route files
  - `ledger.ts` explicit SELECT list (L18–36): add `'a.weight_per_unit_grams'`
**Success Criteria** (what must be TRUE):
  1. `GET /api/dealers` returns `[]` without error after `make dev` — confirms dealers table was created by migration 010
  2. `GET /api/tier-config` returns exactly 4 rows with `tier_id` 0–3 and non-null `target_pct`, `min_pct`, `max_pct` — confirms seed data inserted by migration 011
  3. `GET /api/assets` response objects include `tier` (null or integer) and `weight_per_unit_grams` (null or decimal string) on every asset
  4. `GET /api/ledger` response rows include a `weight_per_unit_grams` field — confirms SELECT list update in ledger.ts
  5. `npm run build` in the frontend container succeeds with zero TypeScript errors after types.ts and api.ts changes
**Plans**: 2 plans
Plans:
- [x] 13-01-PLAN.md — DB migrations (010 dealers, 011 tier system) + Express route stubs (dealers, tierConfig) + routes/index.ts mount
- [ ] 13-02-PLAN.md — TypeScript types (Dealer, TierConfig, Asset/LedgerRow extensions) + api.ts namespaces + ledger.ts SELECT + Sidebar/App View stub

### Phase 14: Dealer Price Management
**Goal**: User can manage dealer entries with gold "We Buy" prices, set unit weights on precious metals assets, and immediately see per-row liquidation values in the Ledger — turning raw acquisition records into priced, sellable inventory
**Depends on**: Phase 13
**Requirements**: DATA-01, MKTD-01, MKTD-02, MKTD-03
**Notes**:
  - `tier = 0` is falsy in JS — any conditional on tier must use `tier != null` not `!tier`
  - Liquidation value computed client-side: `quantity × weight_per_unit_grams × dealer.we_buy_gold_per_gram`; displays `—` when weight is null
  - Show "Updated X days ago" from `updated_at` on each dealer card — stale prices are a trust signal
  - Active dealer selection is client-state only (no DB persistence required)
  - Weight field in AssetModal shown only when `asset_subclass === 'gold'` or `asset_class === 'precious_metals'`
  - Gain/loss color on Liq. Value vs Cost Basis: green if `liq_value > cost_basis`, red if below
**Success Criteria** (what must be TRUE):
  1. User can create a new dealer (name + optional contact notes); the dealer appears in the dealers list immediately after save
  2. User can set and edit a "We Buy" gold price per gram on any dealer; the value persists after page reload and shows "Updated X days ago" freshness indicator
  3. User can delete a dealer; a confirmation is required; deleted dealer no longer appears in any list
  4. User can set `weight_per_unit_grams` on a precious metals asset via the Edit Asset modal (e.g. 31.1 for a 1 troy oz coin); value persists after page reload
  5. The Ledger shows a "Liquidation Value" column when a dealer with a gold price is selected in the Ledger filter bar; column computes `quantity × weight_per_unit_grams × dealer.we_buy_gold_per_gram`; shows `—` when weight is unset on an asset
**Plans**: TBD
**UI hint**: yes

### Phase 15: Sovereign Tier System
**Goal**: User can classify every asset into one of four named sovereign tiers, add crypto holdings as Tier 3 assets, configure per-tier target/min/max allocation bounds, and navigate to a dedicated Tier page that shows live allocation vs target with green/amber/red status per tier
**Depends on**: Phase 14
**Requirements**: TIER-01, TIER-02, TIER-03, TIER-04
**Notes**:
  - `tier = 0` is falsy — all tier checks must guard with `tier != null` (not `if (!tier)`)
  - Tier allocation % denominator must be ALL assets (including unassigned), not just tier-tagged assets
  - TierPage View type + App.tsx switch case + Sidebar nav item must be added atomically (all three or none — broken nav is worse than no nav)
  - Tier names: 0 = Grid-Down, 1 = Digital Liquidity, 2 = The Vaults, 3 = Uncensorable Frontier (hardcoded labels in v1.1)
  - `tier_config` seed rows already exist from Phase 13 — no "add tier" flow; user only edits existing 4 rows
  - Status thresholds: GREEN = within [min, max]; AMBER = outside the bound by ≤5 percentage points; RED = outside by >5pp
  - TierPage layout: single-column vertical list ordered Tier 0 → Tier 3 (not a 2×2 grid); each row has label, current %, range bar, status badge
  - Range bar zones: below-min zone / in-range zone / above-max zone with a current-allocation dot and target tick
  - Sum-not-100% warning shown in amber below the config table (non-blocking — do not prevent save)
**Success Criteria** (what must be TRUE):
  1. User can assign a Tier (0–3) to any asset via the Edit Asset modal using a labelled dropdown; "— Unassigned —" is the default; value persists after reload
  2. User can add a new asset with `asset_class = 'crypto'` (e.g. BTC, XMR) with a manual EUR current value, then assign it to Tier 3; it appears in the asset list and contributes to Tier 3 allocation
  3. On the Tier page, user can edit target %, min %, and max % for any of the 4 tiers inline; changes save on blur; a non-blocking amber warning appears if tier targets do not sum to 100%
  4. Tier page shows each tier's current allocation %, a visual range bar, and a green/amber/red status badge — figures reflect live asset current values from the API
  5. The Tier page is reachable from the Sidebar; navigating to it updates the active nav highlight and `App.tsx` View state to `'tier'`
**Plans**: TBD
**UI hint**: yes

### Phase 16: Dashboard Health Tile
**Goal**: The Dashboard shows a Tier health glass-panel tile that surfaces portfolio tier status at a glance without requiring navigation to the Tier page
**Depends on**: Phase 15
**Requirements**: TIER-05
**Notes**:
  - Extend `GET /api/dashboard/summary` to return a `tier_summary` object — do NOT add a new endpoint
  - `tier_summary` shape: `{ tiers: Array<{ tier_id, name, current_pct, status: 'green' | 'amber' | 'red' }>, in_range: number }` where `in_range` is count of tiers with GREEN status
  - Tile uses `.glass-panel` CSS utility; click navigates to TierPage using `onNavigate` callback (no inline `fetch`, no router)
  - Headline pattern: "X of 4 Tiers In Range" with four status dots below
**Success Criteria** (what must be TRUE):
  1. Dashboard displays a "Tier Health" glass-panel tile showing "X of 4 Tiers In Range" computed from live tier_config and asset data
  2. The tile shows four status dots (one per tier, Tier 0–3) with green/amber/red color matching the TierPage status logic
  3. Clicking the tile navigates to the Tier page
  4. The tile data updates when the entity toggle changes (same refresh pattern as other dashboard tiles)
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Name | Plans Complete | Status | Completed |
|-------|------|----------------|--------|-----------|
| 1 | Foundation | 5/5 | Complete ✓ | 2026-04-10 |
| 2 | Data Model & API | 5/5 | Complete ✓ | 2026-04-10 |
| 3 | App Shell | 0/TBD | Not started | - |
| 4 | Dashboard | 0/TBD | Not started | - |
| 5 | Transaction Ledger | 0/TBD | Not started | - |
| 6 | Performance Analytics | 0/TBD | Not started | - |
| 7 | Asset Locations | 0/TBD | Not started | - |
| 8 | Tax & Compliance | 0/TBD | Not started | - |
| 9 | Business vs. Personal | 0/TBD | Not started | - |
| 10 | Data Entry Forms | 0/TBD | Not started | - |
| 11 | Excel Import | 0/TBD | Not started | - |
| 12 | PWA & Polish | 0/TBD | Not started | - |
| 13 | Data Foundation | 1/2 | In Progress|  |
| 14 | Dealer Price Management | 0/TBD | Not started | - |
| 15 | Sovereign Tier System | 0/TBD | Not started | - |
| 16 | Dashboard Health Tile | 0/TBD | Not started | - |
