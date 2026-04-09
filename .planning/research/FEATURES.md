# Feature Research

**Domain:** Sovereign wealth management dashboard — personal finance, multi-entity, multi-jurisdiction
**Researched:** April 9, 2026
**Confidence:** HIGH (all 6 screens fully designed in .stitch/screens/; features are visible and specified)

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Screen | Notes |
|---------|--------------|------------|--------|-------|
| Fixed sidebar navigation | Standard dashboard chrome | LOW | All screens | `w-64`, sticky, gold brand wordmark "The Vault", 6 nav items |
| Sticky top header | Persistent entity toggle + search + status | LOW | All screens | `h-16`, `backdrop-blur-xl`, Personal/Business/Global toggle |
| Entity toggle (Personal/Business/Global) | Core product requirement — legal separation | MEDIUM | All screens | Top header nav; active state: gold text + `border-b-2 border-primary` |
| Net worth hero with total value | The ONE number every wealth dashboard shows | LOW | Dashboard | `text-6xl font-headline`, Combined/Personal/Business sub-toggle |
| Asset allocation breakdown | Users expect to see where wealth is distributed | LOW | Dashboard | Color-coded list (gold=Real Estate, secondary=Equities, tertiary=Metals) |
| Acquisition table with P&L | Financial tables are standard; batch ROI is differentiating | MEDIUM | Ledger | Tabular nums; ROI in secondary/error color; status chips |
| Filter controls on tables | Without filters, large ledgers are unusable | LOW | Ledger | `bg-surface-container-low` filter bar; dropdowns; asset class / jurisdiction |
| Export button | Tax filing requires exportable records | LOW | Ledger, Tax | "Export Ledger" + "Generate Fiscal Report" + "Export VAT Documentation" |
| Data entry forms | Without forms, data only comes from import | MEDIUM | All | CRUD modals/forms for assets, acquisitions, locations, fiscal tags |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Screen | Notes |
|---------|-------------------|------------|--------|-------|
| Jurisdictional world map | Visual custody tracking — no generic dashboard has this | HIGH | Assets | Greyscale map image + absolute-positioned gold pulse pins; hover tooltip with custodian |
| Glassmorphism panels | Premium private banking aesthetic | LOW | Dashboard, Analytics | `.glass-panel { background: rgba(34,42,61,0.7); backdrop-filter: blur(24px) }` |
| Batch-level P&L drill-down | Performance at acquisition batch, not just asset class | MEDIUM | Analytics | Each batch row shows cost basis, current value, P&L absolute + %, alpha vs benchmark |
| Market ticker bar | Ambient awareness of spot prices | LOW | Analytics | Horizontal scrolling ticker: Gold XAU, Silver XAG, BTC, S&P 500 |
| Atmospheric spotlight gradient | Depth and atmosphere — non-generic | LOW | Business/Personal | `w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]` positioned top-left |
| Excel bulk import | Users with existing spreadsheets need zero-friction onboarding | HIGH | — | SheetJS parse → column mapping → validation → DB insert |
| Fiscal compliance score | Quantified readiness — users want a single "am I done?" number | MEDIUM | Tax | Percentage of assets with fiscal tags assigned |
| Dual-ledger side-by-side view | Legal entity separation visualized | MEDIUM | Business/Personal | Business Assets (left) vs Personal Assets (right) with sync status |
| "Transfer Funds" CTA in sidebar | Quick action always visible — gold gradient CTA | LOW | All screens | `gold-gradient` button at sidebar footer; opens inter-entity transfer modal |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Live price feeds (v1) | Make valuations real-time | Adds external API dependency, rate limits, error states, and a scheduler; blocks MVP shipping | Manual valuation entry with update-date timestamp; defer price feeds to v1.1 |
| Multi-user auth | "What if I share?" | Single-user is a constraint; auth adds significant surface area and complexity to a local tool | No auth — backend trusts all requests by design |
| Mobile-first layout | Portfolio managers check on phone | The 2560px-wide screen designs are explicitly desktop; responsive is out of scope | PWA installable on desktop; no mobile layout v1 |
| Real-time WebSocket updates | "Should refresh automatically" | Overkill for a personal local tool; adds socket server complexity | Page-load fetch + manual refresh button |
| Multi-currency support | User has international assets | Display-layer concern; all data stored in USD; translation is a formatting function | Currency selector for display format; store in USD always |

---

## Feature Map: What Each Screen Delivers

### Screen 1: Global Net Worth Dashboard (`.stitch/screens/global-net-worth-dashboard/`)

Primary components visible in screen HTML:
- **Hero panel** (`glass-panel`, `lg:col-span-2`): total liquidity `$142,850,000`, +2.4% trend, combined/personal/business sub-toggle, sparkline bars
- **Asset allocation panel** (`surface-container-high`): color-coded list — Real Estate 42%, Equities 35%, Metals 18%, Crypto 5%
- **Vault Security Status panel** (`surface-container-low`): custodian connectivity + last-audit timestamp
- **Sidebar CTA**: "Transfer Funds" gold-gradient button

### Screen 2: Transaction Ledger (`.stitch/screens/transaction-ledger/`)

- **Page header**: "Acquisition Ledger" `text-5xl font-headline`; Total Cost Basis + Net Unrealized ROI summary
- **Filter bar** (`surface-container-low rounded-xl`): Tax Status select, Asset Class select, Export Ledger button, More Filters button
- **Table**: `surface-container-low` wrapper; columns: Purchase Date, Asset Description (icon + name + class/location), Cost Basis, Current Value, Net ROI (secondary color + absolute $), Status chip (`rounded-full bg-secondary-container/20 border border-secondary/20`)
- **Row hover**: `hover:bg-surface-container-high/40`

### Screen 3: Performance & Analytics (`.stitch/screens/performance-analytics/`)

- **Market ticker bar** (`surface-container-lowest py-2`): horizontal scrolling — XAU, XAG, BTC, S&P; positive=secondary, negative=error
- **Batch-level table**: asset/batch name, acquisition date, cost basis, current value, P&L absolute, ROI %, alpha vs benchmark
- **Locked assets indicator**: private equity rows with `LOCKED` status
- Analytics page uses `text-tnum` (tabular-nums) class

### Screen 4: Asset Locations & Inventory (`.stitch/screens/asset-locations-inventory/`)

- **Jurisdictional world map**: `lg:col-span-2 h-[500px]`; greyscale image (`opacity-40 mix-blend-luminosity`); gold pulse pins (Zurich CH, Singapore SG, Delft NL, Domestic); hover tooltip `glass-panel` with custodian name
- **Inventory table**: location/asset, spec, quantity, current valuation, audit frequency, audit status (`CERTIFIED`/`Audit Pending`), security class
- **Custody detail panel**: lead security partner, last verified date, access restrictions

### Screen 5: Tax & Compliance Center (`.stitch/screens/tax-compliance-center/`)

- **Page header**: "Tax & Compliance" `text-5xl font-semibold`; "Generate Fiscal Report" + "Export VAT Documentation" buttons
- **Bento grid layout** for compliance score + asset categorization table
- **Asset table**: Asset Name, Current Valuation, Legal Entity, Fiscal Category (editable), Actions
- **Compliance score**: percentage indicator targeting `Optimal`

### Screen 6: Business vs. Personal Breakdown (`.stitch/screens/business-vs-personal-breakdown/`)

- **Atmospheric spotlight**: `w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]` top-left
- **Sync indicator**: "Protocol Active" + "Last Sync: 2m ago" with sync icon
- **Dual column grid** (`grid grid-cols-1 lg:grid-cols-2 gap-8`): Business Assets (Entity: Sovereign-LLC) / Personal Assets
- **Entity badges**: `px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20`

---

## Feature Dependencies

```
Entity Toggle (Personal/Business/Global)
    └──required by──> All 6 screens (data must be filterable by entity everywhere)

Asset CRUD (create/edit/delete)
    └──required by──> Transaction Ledger (read)
    └──required by──> Performance Analytics (read)
    └──required by──> Asset Locations (read)
    └──required by──> Tax & Compliance (read)
    └──required by──> Business vs. Personal (read)

Excel Import
    └──enhances──> Asset CRUD (bulk onboarding path)
    └──depends on──> Asset/Acquisition data model (must exist first)

Acquisition CRUD
    └──required by──> P&L calculation (cost basis source)
    └──required by──> Transaction Ledger (rows = acquisitions)

Fiscal Tag CRUD
    └──required by──> Compliance Score (% of tagged assets)
    └──required by──> Tax export (tags = categories on report)

Location CRUD
    └──required by──> World Map visualization (pins = locations)
    └──required by──> Asset Locations table
```

---

## MVP Definition

### Launch With (v1)

- [ ] Docker Compose full-stack local runtime — nothing works without this
- [ ] DB schema + migrations (all entities: Asset, Acquisition, Location, Entity, FiscalTag, Transfer)
- [ ] REST API CRUD for all entities
- [ ] Sidebar navigation + entity toggle (chrome for all screens)  
- [ ] Global Net Worth Dashboard — hero total, allocation breakdown, security status
- [ ] Transaction Ledger with filters, tabular data, export
- [ ] Performance & Analytics with batch-level P&L
- [ ] Asset Locations & Inventory with world map
- [ ] Tax & Compliance with fiscal tagging and compliance score
- [ ] Business vs. Personal with dual-ledger and sync status
- [ ] Excel bulk import (user's existing data is in Excel — app has no value without initial data)
- [ ] In-app CRUD forms for ongoing management

### Add After Validation (v1.1)

- [ ] Live price feeds (metals, crypto, equities) — once manual entry is confirmed stable
- [ ] Cross-entity transfer entry UI (sidebar CTA "Transfer Funds" is shown but deferred)
- [ ] Report export as PDF (CSV export is v1; PDF formatting is additional work)

### Future Consideration (v2+)

- [ ] Market threshold notifications / alerts
- [ ] Multi-currency display (non-USD)
- [ ] Broker/exchange API integrations
- [ ] Mobile-responsive layout

---

## Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| DB schema + API | HIGH | MEDIUM | P1 |
| Dashboard hero | HIGH | LOW | P1 |
| Transaction Ledger | HIGH | MEDIUM | P1 |
| Entity toggle | HIGH | LOW | P1 |
| Excel import | HIGH | HIGH | P1 |
| Asset Locations + map | HIGH | HIGH | P1 |
| Performance analytics | HIGH | MEDIUM | P1 |
| Tax & Compliance | HIGH | MEDIUM | P1 |
| Business vs. Personal | HIGH | MEDIUM | P1 |
| CRUD forms | HIGH | MEDIUM | P1 |
| Live price feeds | HIGH | HIGH | P2 (deferred) |
| Transfer Funds modal | MEDIUM | MEDIUM | P2 (deferred) |

---

## Sources

- `.stitch/screens/*.html` — all 6 screen implementations analyzed
- `PRD.md` — product requirements
- `.stitch/design-system/DESIGN_SYSTEM.md` — design decisions and constraints

---
*Feature research for: Precious Dashboard*
*Researched: April 9, 2026*
