# INTEGRATIONS
_Last updated: 2026-04-18_

## Overview

The dashboard integrates with one external data source: hollandgold.nl, scraped by a standalone Python service. All other data is local — PostgreSQL via Knex.js, no external APIs, no auth providers, no cloud services. The frontend calls the API exclusively through the `request()` helper in `frontend/src/api.ts`.

---

## External APIs

### Holland Gold (hollandgold.nl)

- **Type:** Web scraping (no public API)
- **Target URL base:** `https://www.hollandgold.nl`
- **Scraper:** `scraper/scraper.py` using Playwright (headless Chromium)
- **Orchestrator:** `scraper/main.py` using `requests` library to POST results to the dashboard API
- **What it scrapes:** Per-gram buyback prices for gold bars (1g, 1oz, 50g, 100g), gold coins, silver bars (1g, 100oz), silver coins, platinum per gram, palladium per gram
- **Pages scraped:**
  - `/verkopen/goudbaren.html` — gold bars
  - `/verkopen/gouden-munten.html` — gold coins
  - `/verkopen/zilverbaren.html` — silver bars
  - `/verkopen/zilveren-munten.html` — silver coins
  - `/verkopen/platina.html` — platinum
  - `/verkopen/palladium.html` — palladium
- **How it writes back:** Calls `PUT /api/dealers/:id` or `POST /api/dealers/:id/refresh-prices` on the local API
- **Config env vars:** `API_BASE_URL` (default `http://localhost:4001`), `DEALER_NAME` (default `HollandGold`)
- **Recommended cron:** `0 9,13,17 * * 1-5` (Mon–Fri, 3× per day, per `scraper/main.py` docstring)
- **Exit codes:** `0` success, `1` scraping failure, `2` API failure

---

## Database

**Engine:** PostgreSQL 16 (`postgres:16` Docker image)
**Connection:** `postgres://precious:precious@db:5432/precious` (Docker) or via `DATABASE_URL` env var
**Client:** Knex.js 3.1.0 (`api/src/db.ts`) with `pg` driver
**Data directory:** `./data/db` (host-mounted volume)
**Migrations:** Auto-run at API startup via `runMigrations()` in `api/src/index.ts`; files at `api/migrations/*.ts`

### Schema — 22 Migrations

| # | Migration | Tables / Changes |
|---|-----------|-----------------|
| 001 | `001_initial.ts` | Empty (confirms pipeline) |
| 002 | `002_entities.ts` | `entities` (`id`, `type` personal/business, `name`, `description`, timestamps) |
| 003 | `003_asset_locations.ts` | `asset_locations` (`id`, `name`, `country_code`, `custodian_name`, `map_x_pct`, `map_y_pct`, timestamps) |
| 004 | `004_assets.ts` | `assets` (`id`, `entity_id` FK, `location_id` FK, `name`, `asset_class`, `current_value` NUMERIC(20,2), `security_class`, `audit_frequency`, `last_audit_date`, `description`, timestamps) |
| 005 | `005_acquisitions.ts` | `acquisitions` (`id`, `asset_id` FK, `purchase_date`, `cost_basis` NUMERIC(20,2), `quantity` NUMERIC(20,6), `tax_status` settled/pending, `description`, timestamps) |
| 006 | `006_fiscal_tags.ts` | `fiscal_tags` — fiscal year labelling per asset |
| 007 | `007_transfers.ts` | `transfers` (`id`, `from_entity_id` FK, `to_entity_id` FK, `amount` NUMERIC(20,2), `transfer_date`, `description`, timestamps) |
| 008 | `008_valuation_snapshots.ts` | `valuation_snapshots` (`id`, `asset_id` FK, `value` NUMERIC(20,2), `snapshotted_at`, `created_at`) — immutable history records |
| 009 | `009_asset_subclass.ts` | Adds `subclass` column to `assets` |
| 010 | `010_dealers.ts` | `dealers` (`id`, `name`, `contact_notes`, `we_buy_gold_per_gram` NUMERIC(10,4), `updated_at`) |
| 011 | `011_tier_system.ts` | Adds `weight_per_unit_grams` + `tier` to `assets`; creates `tier_config` (`tier_id`, `tier_name`, `target_pct`, `min_pct`, `max_pct`, `description`) with 4 seed tiers |
| 012 | `012_dealer_metal_prices.ts` | Adds per-metal/per-product price columns to `dealers` |
| 013 | `013_hollandgold_seed.ts` | Seeds HollandGold dealer record |
| 014 | `014_hollandgold_seed.ts` | HollandGold seed update/fixup |
| 015 | `015_asset_brand.ts` | Adds `brand` column to `assets` |
| 016 | `016_hollandgold_prices_update.ts` | Updates HollandGold price columns |
| 017 | `017_backfill_asset_weights.ts` | Backfill `weight_per_unit_grams` from existing data |
| 018 | `018_location_coordinates.ts` | Adds `latitude`/`longitude` to `asset_locations` |
| 019 | `019_backfill_snapshots.ts` | Backfill `valuation_snapshots` from historical data |
| 020 | `020_location_insurance.ts` | Adds insurance fields to `asset_locations` |
| 021 | `021_dealer_bar_prices.ts` | Adds additional bar-size price columns to `dealers` |
| 022 | `022_tier_config_entity_scope.ts` | Adds `entity_scope` (personal/business) to `tier_config` |

**4 Tier seeds (from migration 011):**
| Tier ID | Name | Target % | Min % | Max % |
|---------|------|----------|-------|-------|
| 0 | Grid-Down Baseline | 2% | 0% | 5% |
| 1 | Digital Liquidity | 8% | 4% | 12% |
| 2 | The Vaults | 70% | 60% | 80% |
| 3 | Uncensorable Frontier | 20% | 10% | 30% |

---

## Internal API Surface

All routes prefixed `/api/` (except `GET /health`). Defined in `api/src/routes/index.ts`.

### Entities — `api/src/routes/entities.ts`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/entities` | List all entities |
| GET | `/api/entities/:id` | Get entity by ID |
| POST | `/api/entities` | Create entity |
| PUT | `/api/entities/:id` | Update entity |
| DELETE | `/api/entities/:id` | Delete entity |

### Asset Locations — `api/src/routes/assetLocations.ts`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/asset-locations` | List all locations |
| GET | `/api/asset-locations/:id` | Get location by ID |
| POST | `/api/asset-locations` | Create location |
| PUT | `/api/asset-locations/:id` | Update location |
| DELETE | `/api/asset-locations/:id` | Delete location |

### Assets — `api/src/routes/assets.ts`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/assets[?entity_id=N]` | List assets, optional entity filter |
| GET | `/api/assets/:id` | Get asset |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset |
| GET | `/api/assets/:id/acquisitions` | List acquisitions |
| POST | `/api/assets/:id/acquisitions` | Create acquisition |
| PUT | `/api/assets/:id/acquisitions/:acqId` | Update acquisition |
| DELETE | `/api/assets/:id/acquisitions/:acqId` | Delete acquisition |
| GET | `/api/assets/:id/fiscal-tags` | List fiscal tags |
| POST | `/api/assets/:id/fiscal-tags` | Create fiscal tag |
| PUT | `/api/assets/:id/fiscal-tags/:tagId` | Update fiscal tag |
| DELETE | `/api/assets/:id/fiscal-tags/:tagId` | Delete fiscal tag |
| GET | `/api/assets/:id/valuation-snapshots` | List snapshots |
| POST | `/api/assets/:id/valuation-snapshots` | Create snapshot |

### Transfers — `api/src/routes/transfers.ts`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transfers` | List transfers |
| GET | `/api/transfers/:id` | Get transfer |
| POST | `/api/transfers` | Create transfer |
| DELETE | `/api/transfers/:id` | Delete transfer |

### Dashboard — `api/src/routes/dashboard.ts`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary[?entity_id=N]` | Portfolio totals, by-class breakdown, tier status |
| GET | `/api/dashboard/history?period=1M|6M|1Y|5Y|ALL[&entity_type=X]` | Historical valuation series |
| POST | `/api/dashboard/recalculate-history` | Recalculate all valuation snapshots |
| GET | `/api/dashboard/recent-activity[?limit=N&entity_type=X]` | Recent asset movements |

### Ledger — `api/src/routes/ledger.ts`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ledger[?entity_type=X&asset_class=Y&tax_status=Z]` | Filterable ledger rows |

### Dealers — `api/src/routes/dealers.ts`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dealers` | List dealers |
| POST | `/api/dealers` | Create dealer |
| PUT | `/api/dealers/:id` | Update dealer |
| POST | `/api/dealers/:id/refresh-prices` | Trigger price refresh (scraper target) |
| DELETE | `/api/dealers/:id` | Delete dealer |

### Tier Config — `api/src/routes/tierConfig.ts`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tier-config?scope=personal|business` | Get tier config for scope |
| PUT | `/api/tier-config/:tierId?scope=personal|business` | Update tier target/min/max |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{ status: 'ok' }` — NOT prefixed with `/api/` |

---

## Frontend → API Pattern

All fetch calls go through a single `request<T>()` helper in `frontend/src/api.ts`. **Never call `fetch()` inline in components.**

```typescript
// frontend/src/api.ts
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: 'Network error', status: res.status } }));
    throw new Error(body.error?.message ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}
```

**Error shape from server:** `{ error: { message: string, status: number } }`
**How errors surface:** `request()` extracts `error.message` and throws it as a plain `Error`

The `api` export object is organized by resource domain:
- `api.entities.*` — entity CRUD
- `api.locations.*` — asset location CRUD
- `api.assets.*` — asset CRUD + nested `.acquisitions.*`, `.fiscalTags.*`, `.snapshots.*`
- `api.transfers.*` — transfer CRUD
- `api.dashboard.*` — summary, history, recalculate, recentActivity
- `api.ledger.*` — ledger list with filters
- `api.dealers.*` — dealer CRUD + refreshPrices
- `api.tierConfig.*` — tier config read/update

---

## File Storage

- **Imports:** User uploads CSV/XLSX in `frontend/src/components/ImportWizard.tsx`; processed client-side with `xlsx` library — no server-side file storage
- **Exports:** Local file generation only (no cloud storage)
- **Assets:** `data/import/` contains seed CSV files (`hollandgold-beheer.csv`, `sample-import.csv`)

---

## No Other Integrations

- No OAuth / auth provider
- No error tracking (Sentry etc.)
- No analytics
- No email / notification services
- No cloud storage
- No CDN
