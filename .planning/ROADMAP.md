# Roadmap: Precious Dashboard v1

## Overview

Twelve phases, dependency-ordered: start with Docker infrastructure and database schema, layer on the API and type system, build the React shell with full Midnight Sovereign visual identity, then deliver each of the six screens as a standalone vertical slice. Close with write capability (CRUD forms + Excel import) that makes the system usable with real data, and ship as a PWA. Every phase produces a testable, observable outcome. No phase blocks another screen's development once Phase 3 (App Shell) lands.

**Milestone:** v1 — Six screens working, real data, local only
**Current Phase:** 1
**Total Requirements:** 75

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
