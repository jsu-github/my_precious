# CONCERNS
_Last updated: 2026-04-18_

## Overview

Precious Dashboard is a single-user local tool with no auth by design. The most pressing issues are a mass-assignment vulnerability in every write route (`req.body` spread directly into Knex), missing database indexes that will degrade the dashboard history query at scale, and several UI stub buttons that render with no `onClick` handler. Additionally, there are two parallel scraper implementations (Python/Playwright and Node.js/regex) that can silently diverge, and hardcoded "HollandGold" string assumptions baked into both migrations and frontend logic.

---

## Security

### Mass-Assignment in All Write Routes (High)
- **Files:** `api/src/routes/assets.ts` lines 58, 64–68; `api/src/routes/dealers.ts` lines 162–175, 213–229; similar pattern in `api/src/routes/entities.ts`, `api/src/routes/assetLocations.ts`, `api/src/routes/transfers.ts`
- **Risk:** Every `POST` and `PUT` route spreads the entire `req.body` into the Knex insert/update call — e.g., `knex('assets').insert(req.body)`. A caller can inject any column name, including `id`, `created_at`, or `updated_at`. For a strictly local single-user tool this is low-exploit-risk, but it is a real mass-assignment vulnerability.
- **Fix:** Whitelist allowed columns in each route: `const { name, asset_class, current_value, ... } = req.body; knex('assets').insert({ name, asset_class, ... })`. The `dealers.ts` PUT handler already does this correctly — apply the same pattern to assets, entities, locations, and transfers.

### Untyped Route Parameters
- **Files:** `api/src/routes/assets.ts` lines 8–28; `api/src/routes/dashboard.ts` line 23
- **Risk:** `req.query.entity_id` is passed directly to `.where('a.entity_id', req.query.entity_id as string)`. Knex parameterizes the value so there is no SQL injection, but there is no validation that it is a non-negative integer. Sending `entity_id=DROP` will silently produce no results. Sending a very large string may cause unexpected DB behavior.
- **Fix:** Parse and validate: `const entityId = parseInt(req.query.entity_id as string, 10); if (isNaN(entityId)) return res.status(400).json(...)`.

### Refresh-Prices Endpoint Makes Outbound HTTP with No Rate Limiting
- **Files:** `api/src/routes/dealers.ts` — `router.post('/:id/refresh-prices', ...)`; `scrapeHollandGoldPrices()` function ~line 130
- **Risk:** Any caller can trigger an outbound scrape to `https://www.hollandgold.nl` by hitting `POST /api/dealers/:id/refresh-prices`. There is no rate limiting, no per-IP throttle, and no debounce. The `fetchText` function has no timeout guard — the outer `https.get` call can hang indefinitely if the site is slow, tying up the Node.js event loop.
- **Fix:** Add a timeout to the `https.get` call via `req.setTimeout(10_000, ...)`. Add a simple per-request cooldown (e.g., check `dealer.updated_at` and reject if < 5 minutes ago).

### CORS Fully Open
- **File:** `api/src/index.ts` line 11
- **Risk:** `app.use(cors())` with no origin restriction. For a Docker-contained local tool this is acceptable, but if the API port is ever forwarded or the host is accessible on a network, any origin can call the API.
- **Note:** By design for single-user local use. Document explicitly and do not expose port 4001 to untrusted networks.

---

## Tech Debt

### Two Parallel Scraper Implementations
- **Files:** `scraper/scraper.py` (Playwright / Python), `api/src/routes/dealers.ts` `scrapeHollandGoldPrices()` (Node.js `https` + regex)
- **Problem:** Both implement the same HollandGold scraping logic independently. They share the same `REFERENCE_PRODUCTS` list (duplicated in both files), the same Dutch price format parsing logic, and the same per-gram calculation. When the site changes or a new product is added, both files must be updated separately.
- **Fix:** Decide on one scraper. The Python/Playwright implementation in `scraper/scraper.py` is more robust (real browser rendering). Remove `scrapeHollandGoldPrices()` from `dealers.ts` and have the Node.js `refresh-prices` endpoint shell-call `main.py` or use a dedicated microservice.

### Duplicated `getDealerRatePerGram` Logic
- **Files:** `frontend/src/utils/metalPricing.ts` (as `getDealerRate`), `api/src/routes/dealers.ts` (as `getDealerRatePerGram`)
- **Problem:** The rate-selection switch-case (gold coin → bar → fallback, silver coin → 100oz → bar fallback, etc.) is duplicated in TypeScript on both sides. The API version is used for the liquidation value endpoint; the frontend version is used for display. Any change to the rate logic must be applied in both places.
- **Fix:** Expose a single `/api/dealers/:id/rate` endpoint that accepts `sub_class`, `product_type`, and `weight_grams`, and call it from the frontend instead of duplicating the logic.

### Hardcoded "HollandGold" in Frontend
- **File:** `frontend/src/pages/DealerPage.tsx` lines 171, 185, 297, 299
- **Problem:** The page hardcodes `'hollandgold'` and `'HollandGold'` as the default dealer selection fallback. If the user renames the dealer or uses the system with a different dealer as primary, the default-selection behavior breaks silently. Line 299 surfaces an error message that tells the user to "create HollandGold" — leaking an internal name to the user.
- **Fix:** Remove the special-case name lookup. Use `dealers[0]` as the default, or persist the selected dealer ID in `localStorage`.

### `e: any` Error Status Pattern
- **Files:** `api/src/routes/assets.ts` lines 49, 70, 97, 133, 146, 182, 195; `api/src/routes/assetLocations.ts` lines 19, 41, 52; `api/src/routes/entities.ts` lines 19, 41, 52; `api/src/routes/transfers.ts` lines 32, 54, 65
- **Problem:** Every 404 uses `const e: any = new Error('...'); e.status = 404; throw e`. This repeats 14 times across route files. Using `any` defeats TypeScript's type safety on the error object.
- **Fix:** Add a typed `HttpError` class (or use the `http-errors` package): `throw new HttpError(404, 'Asset not found')`.

### Dutch Language Strings in English-Only UI
- **File:** `frontend/src/pages/TierPage.tsx` lines 125, 154, 155, 363
- **Problem:** The tier allocation chart uses Dutch labels: "Huidig" (meaning "Current"). The copilot-instructions.md states "English only — no i18n infrastructure." This is inconsistent and would confuse future developers.
- **Fix:** Replace `Huidig` with `Current`.

### `VITE_API_URL` Env Var is Unused
- **Files:** `docker-compose.yml` line 40; `frontend/src/api.ts` line 22
- **Problem:** `docker-compose.yml` sets `VITE_API_URL: http://api:3001` but `api.ts` uses a relative `/api` path (relying on the Vite dev server proxy). The env var is never read anywhere in the frontend source. It creates false confidence that the API URL is configurable.
- **Fix:** Either wire `VITE_API_URL` into `api.ts` as the base URL, or remove the env var from `docker-compose.yml`.

### Duplicate Volume Mount in docker-compose.yml
- **File:** `docker-compose.yml` lines 44–45
- **Problem:** `./frontend/tailwind.config.ts` is mounted twice to the same container path `/app/tailwind.config.ts`. Harmless but indicative of copy-paste error.
- **Fix:** Remove the duplicate line.

---

## Fragile Areas

### Scraper: Exact Dutch Product Name Matching
- **Files:** `scraper/scraper.py` `REFERENCE_PRODUCTS` list; `api/src/routes/dealers.ts` `REFERENCE_PRODUCTS` list
- **Problem:** Both scrapers match prices by looking for exact Dutch product name strings in the page body (e.g., `"C. Hafner 1 gram goudbaar"`). Any site redesign, product name change, or DOM restructuring causes the match to silently return `None`/`null`. The category is skipped without error. The Python scraper logs a warning; the Node.js version silently produces no price for that field.
- **Silver bar single candidate:** `we_buy_silver_bar_per_gram` has only ONE candidate string: `"Zilver per gram in verzekerde opslag btw-vrij Zwitserland"`. If HollandGold renames or removes this product line, silver bar pricing silently stops updating entirely.
- **Impact:** Stale silver/platinum/palladium prices with no user notification.

### Migration 022 Drops and Recreates `tier_config`
- **File:** `api/migrations/022_tier_config_entity_scope.ts`
- **Problem:** The migration does `dropTableIfExists('tier_config')` immediately after reading existing rows into a variable. If the `insert(rows)` step fails (e.g., constraint violation), the table is gone and all tier configuration data is lost. There is no transaction wrapping the drop+recreate.
- **Fix:** Wrap the entire migration in `await knex.transaction(async trx => { ... })` so the drop is rolled back on failure.

### Migration 013/014 Naming Collision
- **Files:** `api/migrations/013_hollandgold_seed.ts`, `api/migrations/014_hollandgold_seed.ts`
- **Problem:** Two migrations share the `_hollandgold_seed` suffix. `013` is actually a schema change (renames `we_buy_silver_per_gram` → `we_buy_silver_bar_per_gram`, adds coin columns) — not a seed. The mislabeling makes the migration history confusing and harder to reason about.
- **Note:** Cannot be renamed after the DB is already migrated (Knex tracks by filename). Document in a comment at the top of `013`.

### `asset.tier === 0` Falsy Trap
- **File:** `frontend/src/types.ts` — comment notes `0 is valid!` for tier
- **Problem:** Tier 0 ("Grid-Down Baseline") is a legitimate value, but JavaScript's falsy check `if (!asset.tier)` or `asset.tier || fallback` evaluates Tier 0 as falsy. Any code path that guards on tier truthiness will misidentify all Tier 0 assets as "unassigned."
- **Risk:** Tier 0 assets disappear from tier allocation charts or are bucketed as unassigned.
- **Fix:** Always use `asset.tier != null` or `asset.tier !== undefined` to check tier assignment. Audit all uses of `asset.tier` in conditional expressions.

### History Query: Unbounded LATERAL Cross-Join
- **File:** `api/src/routes/dashboard.ts` `router.get('/history', ...)` ~line 100
- **Problem:** The query uses `CROSS JOIN LATERAL` over `(N_assets × N_buckets)` combinations. For a 1-year period at monthly granularity with 50 assets = 600 lateral subquery executions per dashboard load. This grows linearly with both portfolio size and time range. The `ALL` period unboundedly grows the bucket count.
- **No index on `valuation_snapshots.snapshotted_at`** — each lateral subquery does an unindexed scan of the snapshots table for the asset, ordered by `snapshotted_at DESC LIMIT 1`.

---

## Missing Features / Stubs

### "Export Rates" Button (No-Op)
- **File:** `frontend/src/pages/DealerPage.tsx` line 346–349
- **Problem:** The Export Rates button renders with no `onClick` handler. Clicking it does nothing. There is no export implementation anywhere in the codebase.

### "Configure Bots" Button (No-Op)
- **File:** `frontend/src/pages/DealerPage.tsx` line 704
- **Problem:** Part of a "Price Protection Plan" banner. Button has no `onClick`. No bot configuration infrastructure exists.

### "Enable Auto-Buy" Button (No-Op)
- **File:** `frontend/src/pages/DealerPage.tsx` line 707
- **Problem:** Same banner as above. Button has no `onClick`. No auto-buy feature exists.

### Static Market Ticker in Analytics Page
- **File:** `frontend/src/pages/AnalyticsPage.tsx` lines 6–13
- **Problem:** `MARKET_TICKERS` is a hardcoded constant with static prices (XAU/USD at $3,208.50, BTC at $82,400, S&P 500 at 5,640, etc.) and static 24h change percentages. The UI renders a live-looking ticker strip with trend arrows, but the data never updates and is labeled "Manual spot prices · Apr 2026". Any session opened after April 2026 shows increasingly stale figures.
- **Risk:** Users may mistake these for live data when making portfolio decisions.
- **Fix:** Either wire to a real price feed, display a clear "as of [date]" label with the hardcoded date, or remove the ticker entirely.

### Private Equity "Lock" Implies Unlockable Feature
- **File:** `frontend/src/pages/AnalyticsPage.tsx` lines 18, ~90
- **Problem:** `LOCKED_CLASSES: AssetClass[] = ['private_equity']` causes the analytics page to render a lock icon and hide P&L for private equity holdings. This implies "unlock" functionality that does not exist — there is no way to view private equity analytics in the current implementation.

---

## Performance

### No Indexes on Foreign Key Columns
- **Files:** `api/migrations/005_acquisitions.ts`, `api/migrations/006_fiscal_tags.ts`, `api/migrations/008_valuation_snapshots.ts`, `api/migrations/007_transfers.ts`
- **Problem:** PostgreSQL does not auto-create indexes on foreign key columns. None of the migrations define explicit indexes on `asset_id` in `acquisitions`, `fiscal_tags`, or `valuation_snapshots`. Every query filtered by `asset_id` (e.g., `WHERE asset_id = X ORDER BY ...`) performs a full sequential scan as the tables grow.
- **Fix:** Add a new migration that creates indexes:
  ```sql
  CREATE INDEX ON acquisitions(asset_id);
  CREATE INDEX ON fiscal_tags(asset_id);
  CREATE INDEX ON valuation_snapshots(asset_id, snapshotted_at DESC);
  ```

### Correlated Subquery Per Asset in Asset List
- **File:** `api/src/routes/assets.ts` lines 14–23
- **Problem:** `GET /api/assets` uses a correlated subquery `(SELECT COALESCE(SUM(quantity::numeric), 0) FROM acquisitions WHERE asset_id = a.id)` for every row in the result. With N assets this is N+1 queries in a trench coat. As the portfolio grows this degrades linearly.
- **Fix:** Replace with a `LEFT JOIN` to a `(SELECT asset_id, SUM(quantity) AS total_quantity FROM acquisitions GROUP BY asset_id)` subquery, joined once.

### `valuation_snapshots` Missing Timestamp Index for History Query
- **File:** `api/migrations/008_valuation_snapshots.ts`
- **Problem:** The dashboard history endpoint (`dashboard.ts`) uses a LATERAL join that queries `valuation_snapshots` by `(asset_id, snapshotted_at DESC LIMIT 1)` for each asset × bucket combination. Without a composite index on `(asset_id, snapshotted_at)`, each lateral lookup is a sequential scan.

---

## Data Integrity

### `asset_class` / `security_class` / `audit_frequency` Are Unconstrained Strings
- **Files:** `api/migrations/004_assets.ts` lines 23–25
- **Problem:** Columns use `table.string()` rather than `table.enu()`. Any string value can be persisted. If a bad value enters the DB (e.g., via direct API call bypassing TypeScript), the frontend will silently fail to match the value against `ASSET_CLASS_LABELS` records and render undefined or blank.
- **Fix:** Add a migration adding PostgreSQL CHECK constraints, or use `table.enu('asset_class', [...])` in the original migration (requires a new migration on existing DB).

### NUMERIC Columns as Strings: Silent `NaN` on Missing Data
- **Files:** `frontend/src/types.ts` (header comment); `frontend/src/pages/AnalyticsPage.tsx` `buildAnalyticsRows()` ~line 56
- **Problem:** The pg driver returns NUMERIC columns as strings. `buildAnalyticsRows` calls `parseFloat(r.cost_basis)`, `parseFloat(r.asset_current_value)`, etc. If any field is `null` or `undefined` (e.g., an asset with no acquisitions), `parseFloat(null)` → `NaN`. NaN propagates silently through arithmetic, producing invisible `NaN` values in portfolio totals and P&L columns.
- **Fix:** Wrap all `parseFloat` calls with a null-guard: `parseFloat(r.cost_basis ?? '0')`. Alternatively, add a helper `safeParseFloat(v: string | null): number` that defaults to 0.

### `total_quantity` Is Computed, Not Stored
- **Files:** `api/src/routes/assets.ts` lines 20–22
- **Problem:** `total_quantity` is derived at query time via correlated subquery. If an acquisition is deleted externally (e.g., direct DB access), the displayed quantity reflects the change but `current_value` does not — creating a split between "how much do I have" and "what is it worth."
- **Note:** This is an acceptable design trade-off for a manual-entry system; just be aware that `current_value` and `total_quantity` can diverge.

### Weight Comparison Using Float Arithmetic
- **Files:** `api/src/routes/dealers.ts` `getDealerRatePerGram()` lines ~255–270; `frontend/src/utils/metalPricing.ts`
- **Problem:** `Math.abs(weightGrams - 31.1035) < 0.01` is used to detect 1oz gold bars. This works when weights are entered precisely, but if a user enters `31.1` (a reasonable approximation), the condition is false and the 1oz bar rate is not applied. The fallback to the generic per-gram rate silently produces a different (slightly lower) liquidation value.

---

## Recommended Actions

### High Priority (correctness and security)
1. **Whitelist fields in all write routes** — Replace `req.body` spreads with explicit destructuring in `api/src/routes/assets.ts`, `api/src/routes/entities.ts`, `api/src/routes/assetLocations.ts`, `api/src/routes/transfers.ts`. `dealers.ts` already does this correctly — use it as the pattern.
2. **Add DB indexes** — New migration: add indexes on `acquisitions(asset_id)`, `fiscal_tags(asset_id)`, `valuation_snapshots(asset_id, snapshotted_at DESC)`.
3. **Wrap migration 022 in a transaction** — Prevent `tier_config` data loss on failed migration in `api/migrations/022_tier_config_entity_scope.ts`.
4. **Guard `asset.tier === 0`** — Audit all conditional checks on `asset.tier`; use `!= null` instead of truthiness check. High risk for Tier 0 portfolio owners.

### Medium Priority (UX correctness and maintainability)
5. **Add `onClick` or remove stub buttons** — Export Rates (`frontend/src/pages/DealerPage.tsx:346`), Configure Bots (`DealerPage.tsx:704`), Enable Auto-Buy (`DealerPage.tsx:707`). A disabled button with a tooltip is better than a no-op active button.
6. **Fix static market ticker** — Either add a real data source, clearly label the hardcoded date, or remove `MARKET_TICKERS` from `frontend/src/pages/AnalyticsPage.tsx`.
7. **Remove hardcoded "HollandGold" from frontend** — Replace name-based lookup with `dealers[0]` default or `localStorage` persistence in `frontend/src/pages/DealerPage.tsx` lines 171, 185, 297, 299.
8. **Consolidate scrapers** — Remove the Node.js `scrapeHollandGoldPrices()` from `api/src/routes/dealers.ts` and have the refresh endpoint invoke `scraper/main.py` via subprocess, or convert the Python scraper to TypeScript.
9. **Fix "Huidig" Dutch strings** — Replace with `Current` in `frontend/src/pages/TierPage.tsx` lines 125, 154, 155, 363.

### Low Priority (code hygiene)
10. **Replace `e: any` error pattern** — Add a shared `HttpError` class to `api/src/middleware/` and use it in all route files.
11. **Remove duplicate `VITE_API_URL`** — Remove from `docker-compose.yml` or wire it into `frontend/src/api.ts`.
12. **Remove duplicate tailwind.config.ts volume mount** — `docker-compose.yml` lines 44–45.
13. **Replace correlated subquery** — Convert the `total_quantity` subquery in `GET /api/assets` (`api/src/routes/assets.ts` lines 20–22) to a `LEFT JOIN` grouped subquery.
14. **Validate numeric query params** — Parse and validate `entity_id`, `assetId`, route `id` params as integers before passing to Knex.

---

_Concerns audit: 2026-04-18_
