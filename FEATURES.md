# Features

A running log of all notable features shipped in the Precious Dashboard, organized by milestone.

---

## Recently Added

- **T4 Paper Prosperity Tier**: New fifth tier (T4) for conventional market exposure — stocks, bonds, ETFs. Seeded into both personal and business scopes (`target: 10%, min: 0%, max: 20%`); all tier presets rebalanced to include a T4 allocation; dashboard risk label threshold updated to scale dynamically with any number of tiers.
- **Tier Allocation Presets**: One-click preset buttons (Very Defensive → Very Relaxed) on the Tier System page bulk-apply target allocations to all tiers with ±10% auto-computed min/max bounds; selection is tracked per entity scope and clears automatically on any manual tier edit.
- **Tier Legend EUR Amounts**: Allocation legend now shows current €, model €, and delta € values alongside percentages for each tier, giving immediate capital context to rebalancing decisions.
- **Persistent Navigation State**: Active page and entity filter are saved to `localStorage` and restored on refresh.
- **Dealer Page Auto-Selection**: HollandGold (or first available dealer) is automatically selected on page load.

---

## v1.1 — Market Intelligence & Sovereign Tier System

### Dealer & Pricing
- **Dealer Management**: Create, edit, and delete dealers (name, contact notes); dealer chip selector on the Dealer page with colored metal-coverage dots showing which rates are configured.
- **Multi-Metal Bid Prices**: 10 "We Buy" rate fields per dealer — gold 1g, 1oz bar, 50g bar, 100g bar, coin; silver storage/bar, 100oz bar, coin; platinum; palladium — all in €/gram.
- **Weight-Aware Rate Selection**: `getDealerRate()` util picks the correct rate for an asset based on sub-class + product type + exact weight in grams (e.g. a 50g bar gets the 50g rate, not the generic bar rate).
- **Dealer Spot Panel**: Dealer page shows live-derived troy-oz prices for Au, Ag, Pt, Pd computed from the active dealer's per-gram rates.
- **Price Freshness Indicator**: Each dealer shows when prices were last updated — color-coded (today / 1–7d / stale).
- **Refresh Prices Button**: Calls `POST /api/dealers/:id/refresh-prices`, which scrapes hollandgold.nl product pages server-side and writes updated rates into the DB.
- **Python Scraper**: Standalone `scraper/` module (Python + requests/BeautifulSoup) fetches live "We Buy" prices from hollandgold.nl for all 10 rate fields; designed to be scheduled via cron (Mon–Fri, 3×/day).
- **Metal Price Matrix**: Tabbed UI (Gold / Silver / Platinum / Palladium) showing per-product-type rate rows; edit form for inline price entry.
- **Vendor Catalog**: Per-dealer asset catalog filtered to the active metal tab showing all assets with computed liquidation values.

### Asset Weight Tracking
- **Weight Fields**: `weight_per_unit` + `weight_unit` (g or oz) on every asset; `toGrams()` util handles troy-oz → gram conversion (1 oz = 31.1035 g).

### Ledger Liquidation Value
- **Per-Row Liquidation Value**: Ledger shows a computed liquidation value column (qty × `toGrams(weight)` × dealer rate) for precious metal rows.
- **Dealer Selector**: Dropdown in the Ledger header selects which dealer's rates to use for liquidation math; only dealers with at least one price configured are shown.

### Tier System
- **Tier Assignment on Assets**: Assign Tier 0–3 to each asset via the Asset modal; asset class defaults auto-populate (precious_metals → T2, crypto → T3, cash → T1).
- **Named Tiers**: T0 = Grid-Down Baseline, T1 = Digital Liquidity, T2 = The Vaults, T3 = Uncensorable Frontier.
- **Sovereign Tier System Page**: Dedicated TierPage showing per-entity (Personal/Business) current allocation % vs. target/min/max; inline edit of target/min/max per tier; RangeBar visualization; StatusBadge (In Range / Near Bound / Out of Range).
- **Allocation Donut Charts**: Side-by-side SVG donut charts for Current vs. Model allocations; legend table with % values.
- **Asset List per Tier Card**: Each tier card lists assigned assets with their value and entity; move-to-tier control to reassign assets without leaving the page.
- **Dashboard Tier Health Tile**: Summary tile on the main dashboard showing X/4 tiers in range, mini allocation bars per tier, and a direct link to the Tier System page.

---

## v1.0 — Foundation

### Infrastructure
- **Docker Compose Stack**: Single `make dev` starts frontend (Vite :3000), API (Express :3001), and PostgreSQL 16 with hot-reload and volume mounts; `make migrate`, `make logs-api`, and `make clean` for ops.
- **PWA**: Installable on desktop and mobile — `manifest.json`, service worker with offline shell caching, and app icons.
- **Auto-Migration**: `runMigrations()` runs all pending sequential Knex migrations at API startup; no manual step needed in development.

### Data Model (22 Migrations)
- **Entities**: Personal and business entity types with name and description.
- **Asset Locations**: Name, country code, custodian name, GPS coordinates (lat/lon), insurance amount.
- **Assets**: Full asset record — entity, location, name, asset class (8 types), sub-class, product type, brand, weight per unit + unit, tier, current value, security class, audit frequency, last audit date.
- **Acquisitions**: Per-batch purchase records — purchase date, cost basis, quantity, tax status (settled/pending), notes.
- **Fiscal Tags**: Fiscal year, category, and jurisdiction tags per asset.
- **Transfers**: Inter-entity monetary transfers with amount, date, and description.
- **Valuation Snapshots**: Point-in-time value records per asset; drives portfolio history charts.
- **Dealers & Tier Config**: Dealer table with 10 rate columns; `tier_config` with per-entity scope (personal/business) target/min/max % per tier.

### REST API
- **Full CRUD**: Endpoints for entities, asset locations, assets, acquisitions, fiscal tags, transfers, dealers, and tier config under `/api/`.
- **Nested Routes**: Acquisitions, fiscal tags, and valuation snapshots mounted under `/api/assets/:id/`.
- **Ledger Endpoint**: `GET /api/ledger` — acquisitions joined with asset, entity, and location data; filterable by entity type, asset class, and tax status.
- **Dashboard Summary**: `GET /api/dashboard/summary` — total value, asset count, breakdown by asset class, and tier health summary (in-range count per tier).
- **Portfolio History**: `GET /api/dashboard/history?period=1M|6M|1Y|5Y|ALL` — time-bucketed valuation snapshots using `generate_series` + fill-forward lateral join for gapless charts; supports entity type filter.
- **Recalculate History**: `POST /api/dashboard/recalculate-history` — re-derives and writes snapshot records from current asset values.
- **Recent Activity**: `GET /api/dashboard/recent-activity` — last N asset movements (recent acquisitions/updates) with entity filter.
- **Centralized Error Handler**: All routes use a single `errorHandler` middleware returning `{ error: { message, status } }`.

### Dashboard
- **Global Net Worth Hero**: Large EUR total with asset count and last-updated timestamp; entity-view pill indicator.
- **KPI Strip**: 4 cards — Liquid Assets (cash class total), Asset Count, number of entities, and data freshness.
- **Portfolio Trajectory Chart**: Bar chart of valuation history with 5 period selectors (1M / 6M / 1Y / 5Y / ALL); hover tooltip shows absolute value, MoM %, and YoY % per bucket.
- **Recalculate Button**: Triggers `POST /api/dashboard/recalculate-history` and refreshes the chart inline.
- **Asset Class Breakdown**: Table of asset classes sorted by value with % of portfolio and EUR amount.
- **Precious Metals by Metal**: Separate breakdown of PM assets by sub-class (gold, silver, platinum, etc.).
- **Location Stats**: Per-location asset count, total value, and audit freshness badge derived from last audit date (Recent ≤30d / Stale ≤90d / Overdue).
- **Recent Activity Feed**: Last 5 asset movements fetched from the API, entity-filtered.
- **Tier Health Tile**: X/4 in-range count, per-tier mini bars, derived risk label (Low / Low-Med / Medium), clickable link to TierPage.
- **Add Asset Quick Action**: "Add Asset" button directly from the Dashboard hero opens the AssetModal.

### Transaction Ledger
- **Multi-Filter Pipeline**: Filter by entity type (Personal/Business/Combined), asset class, sub-class, and product type simultaneously.
- **Proportional ROI**: Per-acquisition current value derived as `(cost_basis / asset_total_cost) × asset_current_value`; ROI % shown per row.
- **Liquidation Value Column**: Per-row liquidation value using the selected dealer's rates (same logic as on the Dealer page).
- **CSV Export**: Exports all visible rows with headers (Purchase Date, Asset, Class, Entity, Tax Status, Cost Basis, Current Value, ROI $, ROI %) as a dated `.csv` file.
- **Add Acquisition**: Opens `AcquisitionModal` pre-scoped to a selected asset.
- **Import Wizard Access**: "Import" button opens the CSV/Excel import wizard inline in a modal.

### Analytics Page
- **Market Ticker Strip**: Horizontal scrollable ticker showing XAU, XAG, BTC, SPX, DXY, XPT prices with directional change % (static manual reference values, clearly labelled).
- **Benchmark Comparison**: Adjustable benchmark % (default 12.5%); each asset row shows Alpha (ROI − benchmark).
- **P&L by Asset Class**: Aggregated gain/loss per class with color-coded values.
- **Portfolio History Chart**: 1Y bar chart with MoM/YoY tooltip (same component as Dashboard).
- **History Recalculate**: Recalculate button available on Analytics too.

### Locations Page
- **Interactive World Map**: `react-simple-maps` zoomable/pannable map (initial center: Netherlands, zoom 4×); markers scale inversely to zoom so pins stay ~5px on screen at any zoom level.
- **Asset Pin Counts**: Markers show a badge with the number of assets at each location; hovering shows a tooltip with location name, custodian, country, and asset count.
- **Zoom Controls**: +/− pill buttons and drag-to-pan; zoom range 1×–12×.
- **Location CRUD**: Create, edit, delete locations with name, country code, custodian name, GPS coordinates, and insurance amount.
- **Asset Inventory per Location**: Drill-down view listing all assets at a location with security class, audit frequency, and last audit date.
- **Insurance Coverage**: Insurance amount stored and displayed per location.

### Tax & Compliance Page
- **Fiscal Tag Inline Edit**: Click any asset row to add or edit its fiscal tag inline — category and jurisdiction fields; saved immediately via API.
- **Tag Overview**: Summary showing tagged vs. untagged assets and capital exposure per fiscal category.
- **Fiscal CSV Export**: Export fiscal report for the current year with asset name, entity, class, value, fiscal year, category, jurisdiction, and notes.

### Entity Page
- **Side-by-Side Entity Columns**: Each entity rendered as a column — total value, % of portfolio, asset class breakdown with mini progress bars and color-coded class dots.
- **Asset List per Entity**: Scrollable list of assets per entity with individual values.
- **Liquidity Donut**: SVG donut showing liquid (cash class) % of each entity's portfolio.
- **Inter-Ledger Activity Feed**: Static feed showing cross-entity transfer history entries.
- **Transfer Tracking**: `transfers` table + API for recording inter-entity capital movements.

### Risk Scoring
- **Risk Dimensions**: Create, edit, and delete custom risk dimensions (e.g. Counterparty, Liquidity); 5-point scale (1 = Extra Low … 5 = Critical); 3 defaults seeded.
- **Asset Risk Scores**: Per-dimension score entry on the Asset Detail page; stored as integers; labels rendered via `SCORE_LABELS` lookup.
- **Mitigations**: Free-text mitigation notes per score on Asset Detail; nested REST API under `/api/assets/:id/scores/:scoreId/mitigations`.

### Data Entry
- **Asset Modal**: Full create/edit modal with all fields — entity, location, asset class, sub-class, product type, brand, weight, tier, current value, security class, audit frequency, last audit date, description.
- **Auto-Name Builder**: For precious metal assets, the asset name is auto-derived from brand + metal + type + weight (e.g. "Maple Leaf Gold Coin 1oz") with manual override.
- **Acquisition Modal**: Create and edit acquisitions — purchase date, cost basis, quantity, tax status, description.
- **Entity Modal**: Create and edit entities with name, type (personal/business), and description.
- **Excel/CSV Import Wizard**: Multi-step wizard using SheetJS (`xlsx`) — drag-and-drop or click file upload; fuzzy column-header auto-mapping (aliases for common export formats); column mapping UI with dropdown overrides; row validation with inline error display; batch insert via API; supports the HollandGold CSV export format and Excel serial dates.
