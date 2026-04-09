# Requirements — Precious Dashboard v1

**Product:** Precious Dashboard — Unified Sovereign Wealth Command Center
**Version:** 1.0
**Status:** Active
**Source:** PROJECT.md + research/FEATURES.md + PRD.md + .stitch/screens analysis

---

## v1 Requirements

### Infrastructure

- [ ] **INFRA-01**: Developer can start the full stack with `make dev` (Docker Compose — frontend :3000, API :3001, PostgreSQL :5432)
- [ ] **INFRA-02**: Developer can reset to clean state with `make clean` (stops containers, removes volumes)
- [ ] **INFRA-03**: API auto-runs all pending migration files at startup (no manual migrate step in normal workflow)
- [ ] **INFRA-04**: App is installable as a PWA from the browser (manifest + service worker)
- [ ] **INFRA-05**: All monetary values are stored as `NUMERIC(20, 2)` in PostgreSQL — never `FLOAT` or `DOUBLE`
- [ ] **INFRA-06**: API returns errors in shape `{ error: { message: string, status: number } }`

### Data Model & API

- [ ] **DATA-01**: System supports two legal entity types: `personal` and `business` (e.g. Personal Principal, Sovereign-LLC)
- [ ] **DATA-02**: User can create, read, update, and delete **Entities** (legal personas)
- [ ] **DATA-03**: User can create, read, update, and delete **Assets** with: entity, asset class, current value, location, security class, audit frequency, last audit date
- [ ] **DATA-04**: Asset classes supported: `precious_metals`, `real_estate`, `equities`, `crypto`, `private_equity`, `fixed_income`, `cash`, `exotics`
- [ ] **DATA-05**: User can create, read, update, and delete **Acquisitions** (purchase batch records) linked to assets: purchase date, cost basis, quantity, tax status, description
- [ ] **DATA-06**: User can create, read, update, and delete **Asset Locations** (jurisdictional custodians) with: country code, custodian name, map pin position (x/y % of world map)
- [ ] **DATA-07**: User can create, read, update, and delete **Fiscal Tags** linked to assets: fiscal year, fiscal category, jurisdiction, notes
- [ ] **DATA-08**: System stores **Transfer** records (inter-entity transactions) with: from/to entity, amount, date, description — for audit trail
- [ ] **DATA-09**: System stores **Valuation Snapshots** (point-in-time asset values) — auto-created when `current_value` is updated — for performance charts
- [ ] **DATA-10**: All API endpoints prefixed `/api/` (except `/health`); nested sub-resources mounted on parent router (e.g. `POST /api/assets/:id/acquisitions`)

### Navigation & Layout

- [ ] **NAV-01**: App renders a persistent fixed sidebar (`w-64`) with: "The Vault" wordmark (Newsreader italic gold), 6 navigation links (Dashboard, Assets, Business vs Personal, Analytics, Ledger, Tax), Transfer Funds CTA, Security Status + Support footer links
- [ ] **NAV-02**: Active sidebar link is highlighted: gold text (`#e9c349`) + left border (`border-l-2 border-[#e9c349]`) + subtle background (`bg-[#222a3d]/50`)
- [ ] **NAV-03**: App renders a persistent sticky top header (`h-16`, `bg-[#0b1326]/70 backdrop-blur-xl`) with: global asset search, Personal/Business/Global entity tab links, Market Connected status indicator, currency display, notifications bell, user avatar
- [ ] **NAV-04**: Navigation uses discriminated union `View` state in `App.tsx` — no React Router; pages receive `onNavigateTo...` callback props
- [ ] **NAV-05**: Entity filter state (`personal | business | combined`) lives in `App.tsx` and is passed to all pages — all data responds to entity selection

### Dashboard

- [ ] **DASH-01**: Dashboard shows a hero total net worth figure (e.g. `$142,850,000`) in `font-headline` large text with a trend indicator (+/- percentage since last period)
- [ ] **DASH-02**: Dashboard hero supports sub-toggle: Combined / Personal / Business — total recalculates per selection
- [ ] **DASH-03**: Dashboard shows an asset allocation breakdown by class with color-coded indicators and percentage values (Real Estate, Equities, Metals, Crypto, etc.)
- [ ] **DASH-04**: Dashboard shows a Vault Security Status panel with custodian connectivity and last-audit timestamp
- [ ] **DASH-05**: Dashboard hero card uses glassmorphism styling: `background: rgba(34,42,61,0.7); backdrop-filter: blur(24px)`

### Transaction Ledger

- [ ] **LEDG-01**: Ledger page shows all acquisition records as a table with columns: Purchase Date, Asset Description (icon + name + class + location), Cost Basis, Current Value, Net ROI (absolute $ + % in secondary color), Audit Status chip
- [ ] **LEDG-02**: All monetary columns use `tabular-nums` / `font-variant-numeric: tabular-nums` to prevent column width jitter
- [ ] **LEDG-03**: Ledger table uses `divide-y divide-outline-variant/10` for row separation — no 1px solid borders
- [ ] **LEDG-04**: Ledger has a filter bar (`bg-surface-container-low rounded-xl`) with: Tax Status dropdown, Asset Class dropdown, More Filters button
- [ ] **LEDG-05**: Ledger shows a summary row: Total Cost Basis + Net Unrealized ROI total
- [ ] **LEDG-06**: User can export the ledger as CSV with audit-ready formatting
- [ ] **LEDG-07**: Audit Status chips use: `rounded-full bg-secondary-container/20 text-secondary border border-secondary/20` (Settled) and `border-error/20 text-error` (Pending) styling
- [ ] **LEDG-08**: Ledger filters by entity (Personal/Business/Combined) via the global entity toggle

### Performance & Analytics

- [ ] **ANAL-01**: Analytics page shows a horizontal scrolling market ticker bar with spot prices for Gold (XAU), Silver (XAG), Bitcoin (BTC), S&P 500 — positive values in secondary color, negative in error color
- [ ] **ANAL-02**: Analytics page shows a batch-level table with: Asset/Batch Name, Acquisition Date, Cost Basis, Current Value, P&L (absolute), ROI (%), Alpha vs benchmark
- [ ] **ANAL-03**: Private equity / locked assets display a `LOCKED` status indicator in the analytics table
- [ ] **ANAL-04**: Analytics page filters by entity via the global entity toggle
- [ ] **ANAL-05**: Analytics uses `text-tnum` / `tabular-nums` on all financial figures

### Asset Locations & Inventory

- [ ] **LOC-01**: Locations page shows a world map panel (`h-[500px]`) with a greyscale base map image and dynamically-positioned gold pulse pins for each asset location
- [ ] **LOC-02**: Map pins use: `w-4 h-4 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(233,195,73,0.8)]` — position driven by `map_x_pct` / `map_y_pct` from DB
- [ ] **LOC-03**: Hovering a map pin shows a `glass-panel` tooltip with custodian name and location details
- [ ] **LOC-04**: Locations page includes an inventory table: Location/Asset, Spec/Quantity, Current Valuation, Audit Frequency, Audit Status, Security Class
- [ ] **LOC-05**: Audit Status chips on inventory table use `CERTIFIED` (secondary) / `Audit Pending` (error) styling
- [ ] **LOC-06**: User can add/edit/delete Asset Locations (with custodian name and map pin position)

### Tax & Compliance

- [ ] **TAX-01**: Tax & Compliance page shows a page header with: "Generate Fiscal Report" button and "Export VAT Documentation" button
- [ ] **TAX-02**: Tax page shows an asset table with columns: Asset Name, Current Valuation, Legal Entity, Fiscal Category (editable inline or via modal), Actions
- [ ] **TAX-03**: User can assign a Fiscal Category (Fiscal Tag) to each asset: fiscal year, category label, jurisdiction
- [ ] **TAX-04**: Tax page shows a Compliance Score — percentage of assets that have been fiscal-tagged for the current fiscal year
- [ ] **TAX-05**: User can export fiscal documentation (CSV or PDF) for tax filing
- [ ] **TAX-06**: Tax page filters by entity via the global entity toggle

### Business vs. Personal

- [ ] **BVP-01**: Business vs Personal page shows a dual-column layout (`grid-cols-1 lg:grid-cols-2`) comparing Business Assets (left, labeled with entity name e.g. `Sovereign-LLC`) and Personal Assets (right)
- [ ] **BVP-02**: Page shows an "atmospheric spotlight" background effect: `w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]` positioned top-left for visual depth
- [ ] **BVP-03**: Page shows a sync status indicator: "Protocol Active" + "Last Sync: 2m ago" with a sync icon in an outlined panel
- [ ] **BVP-04**: Entity badges use: `px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20` styling
- [ ] **BVP-05**: Page shows asset metrics per column: total valuation, asset class breakdown, key holdings
- [ ] **BVP-06**: Page filters by entity via the global entity toggle

### Data Entry (CRUD Forms)

- [ ] **CRUD-01**: User can create a new Asset via an in-app form/modal with all required fields
- [ ] **CRUD-02**: User can edit an existing Asset (including updating `current_value` to trigger a valuation snapshot)
- [ ] **CRUD-03**: User can delete an Asset (with confirmation prompt; cascades to linked acquisitions and fiscal tags)
- [ ] **CRUD-04**: User can add an Acquisition (purchase batch) to any asset
- [ ] **CRUD-05**: User can edit and delete Acquisitions
- [ ] **CRUD-06**: User can add/edit/delete Asset Locations including setting map pin position
- [ ] **CRUD-07**: User can create and manage Fiscal Tags on assets

### Excel Import

- [ ] **IMP-01**: User can upload an Excel (.xlsx or .xls) file via a file upload interface
- [ ] **IMP-02**: App presents a column mapping UI: user maps their Excel column headers to the expected import fields (Asset Name, Asset Class, Entity, Acquisition Date, Cost Basis, etc.)
- [ ] **IMP-03**: Import validates required fields before inserting; returns per-row error list for failed rows
- [ ] **IMP-04**: Successful import shows count of imported records: `{ imported: N, errors: [...] }`
- [ ] **IMP-05**: Import runs in a database transaction — either fully succeeds or fully rolls back

### Design System Compliance

- [ ] **DS-01**: All Midnight Sovereign tokens from `.stitch/design-system/midnight-sovereign.json` are loaded into `tailwind.config.ts` (no CDN-to-bundled drift)
- [ ] **DS-02**: `.glass-panel`, `.gold-gradient`, `.tabular-nums`, and Material Symbols icon variable font settings are defined as global CSS utilities
- [ ] **DS-03**: Glassmorphism (`backdrop-filter: blur(24px)`) is applied only to overlay elements (panels, modals, header) — never to repeated list/table items
- [ ] **DS-04**: All financial figures across the app use `tabular-nums` / `font-variant-numeric: tabular-nums`
- [ ] **DS-05**: All page titles use `font-headline` (Newsreader) at `text-4xl` or larger
- [ ] **DS-06**: Table row separation uses `divide-y divide-outline-variant/10` — never 1px solid borders

---

## v2 Requirements (Deferred)

- Live price feeds for metals (XAU/XAG), crypto (BTC), equities (S&P) — manual valuations confirmed for v1
- Transfer Funds modal UI (inter-entity transfer entry) — schema exists, UI deferred
- PDF export for fiscal reports — CSV export is v1; formatted PDF requires additional work
- Market threshold notifications / alerts
- Multi-currency display (non-USD base)
- Drag-to-position world map pin editor (v1 uses coordinate input fields)
- Performance time-series charts (requires valuation snapshot history accumulation over time)
- Broker/exchange API integrations

---

## Out of Scope

- **Authentication / multi-user access** — single-user local personal tool; backend trusts all requests by design
- **Mobile-native layout** — all 6 screens are 2560px desktop designs; PWA installability only
- **React Router** — architecture constraint: discriminated union `View` navigation is required
- **Any UI component library (MUI, Shadcn, etc.)** — all screens use custom HTML/Tailwind; no external component model
- **i18n / localization** — English only
- **External cloud deployment** — local Docker only
- **Automated broker integrations** — manual entry + Excel import only for v1
- **WebSocket real-time updates** — page-load fetch + manual refresh

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| (filled by roadmap) | | |

---

*Requirements for: Precious Dashboard v1*
*Defined: April 9, 2026*
