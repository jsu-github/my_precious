# The Vault — Precious Metals & Assets Dashboard

A personal sovereign wealth dashboard for tracking physical precious metals, cash, and other hard assets across multiple vaults and entities. Fully local, no cloud, no auth.

## Features

- **Multi-entity portfolio** — separate Privé and Beheer (B.V.) ledgers, or view globally
- **Asset tracking** — gold, silver, platinum, cash with vault location, sub-class (metal type), and product type (bar / coin)
- **Transaction ledger** — all acquisitions with cost basis, current value, and unrealised ROI
- **Filterable by** asset class, metal type, coin/bar, and tax status
- **Analytics** — P&L per acquisition, portfolio-level ROI vs benchmark
- **Locations** — world map view with vault pins per country
- **Fiscal tagging** — per-asset fiscal year categorisation + compliance score
- **Import wizard** — drag & drop Excel/CSV with fuzzy column auto-mapping
- **CRUD modals** — add/edit entities, assets, and acquisitions in-app
- **Installable PWA** — install on desktop/mobile, works offline (API calls cache 5 min)

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind CSS v3 |
| API | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 (via Knex.js) |
| Runtime | Docker Compose — single command start |

## Getting Started

**Prerequisites:** Docker + Docker Compose

```bash
# Clone and start
git clone <repo-url>
cd precious_dashboard
make dev
```

- Frontend: http://127.0.0.1:4000  
- API: http://127.0.0.1:4001  
- Health check: http://127.0.0.1:4001/health

The database migrations run automatically on API startup. No separate setup step needed.

## Commands

```bash
make dev        # Start full stack with hot reload
make up         # Start in background (detached)
make down       # Stop containers
make clean      # Stop + remove all volumes (full reset)
make logs-api   # Tail API logs
make migrate    # Run migrations manually (normally auto)
```

## Database

PostgreSQL runs in Docker. Data is persisted in `data/db/` (git-ignored).

```
Host:     localhost:5432
User:     precious
Password: precious
Database: precious
```

To reset to empty and start fresh:
```bash
make clean && make dev
```

To connect directly:
```bash
docker compose exec db psql -U precious -d precious
```

## Adding Data

Three ways to populate your portfolio:

1. **In-app** — Dashboard → `+ Add Asset`, Ledger → `Add to asset…`
2. **Import wizard** — Ledger → `Import` → drag & drop your Excel/CSV export from Hollandgold, Nederlandse Kluis, etc.
3. **Direct SQL** — `docker compose exec db psql -U precious -d precious`

### Import CSV format

```csv
asset_name,entity_name,asset_class,current_value,purchase_date,cost_basis,quantity,tax_status,description
Umicore 50 gram goudbaar,J. Suijker Beheer B.V.,precious_metals,49490,2022-07-14,2910,1,settled,TX:100074159
```

See `data/import/sample-import.csv` for a full example.

### Asset classes

`precious_metals` · `real_estate` · `equities` · `crypto` · `private_equity` · `fixed_income` · `cash` · `exotics`

### Sub-class & product type

Set directly in the DB or via Edit Asset modal:

```sql
UPDATE assets SET sub_class='gold', product_type='bar' WHERE id = 1;
```

Common values: `sub_class` → `gold | silver | platinum` · `product_type` → `bar | coin`

## Project Structure

```
api/
  src/
    index.ts          # Express app entry point
    db.ts             # Knex singleton + runMigrations()
    routes/           # entities, assets, ledger, locations, transfers, dashboard
  migrations/         # Sequential Knex migrations (auto-run on startup)

frontend/
  src/
    api.ts            # All fetch calls — single request() helper
    types.ts          # Shared types (single source of truth)
    App.tsx           # Root — discriminated union View state (no React Router)
    pages/            # DashboardPage, LedgerPage, AnalyticsPage, LocationsPage, TaxPage, EntityPage
    components/
      modals/         # Modal, FormFields, EntityModal, AssetModal, AcquisitionModal
      ImportWizard    # 4-step Excel/CSV import wizard

data/
  db/                 # PostgreSQL volume (git-ignored)
  import/             # Sample and real import CSV files
```

## Design

Dark-first UI: `#0b1326` navy background, gold `#e9c349` accent, emerald `#4edea3` positive ROI. No external UI component library.

## Notes

- All monetary values are in **EUR**
- Prices are entered manually — no live price feeds
- Single-user, fully local — no authentication
- `data/db/` is excluded from git; back it up separately if needed
