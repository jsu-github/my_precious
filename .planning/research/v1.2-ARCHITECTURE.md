# Architecture Research
**Domain:** Precious Metals + Crypto Portfolio Dashboard
**Researched:** 2026-04-13
**Milestone scope:** v1.2 (established foundation) + v1.3 (Crypto Asset Tracking extension)
**Confidence:** HIGH — all findings derived directly from reading the live codebase

---

## v1.2 Foundation (Already Researched — Do Not Re-Derive)

The v1.2 research established the following architecture. v1.3 builds on top of it.

### v1.2 Adds

| What | Location | Notes |
|------|----------|-------|
| `spot_prices` table | migration `021_spot_prices.ts` | Append-only time-series; `(metal, price_per_gram, recorded_at)`; `DISTINCT ON (metal)` for latest |
| `GET /api/spot-prices/latest` | `api/src/routes/spotPrices.ts` | One row per metal |
| `POST /api/spot-prices` | same | Manual spot price entry |
| `GET /api/valuation/summary` | `api/src/routes/valuation.ts` | Portfolio totals |
| `GET /api/valuation/breakdown` | same | Per-asset valuation rows with metal / premium decomposition |
| `POST /api/valuation/recalculate` | same | Batch-updates `assets.current_value` for precious_metals, then snapshots |
| `ValuationPage.tsx` | `frontend/src/pages/ValuationPage.tsx` | New page — value summary + decomposition table |

### v1.2 Hybrid Valuation Pattern (canonical)

`assets.current_value` remains the single stored field read by dashboard, ledger, tiers, and history.
Recalculate computes fresh values from spot prices, writes them back to `current_value`, and inserts
`valuation_snapshots` rows — exactly as the existing `PUT /api/assets/:id` does on manual edit.

```
User enters spot prices → POST /api/spot-prices (append)
User triggers recalculate → POST /api/valuation/recalculate
  → UPDATE assets.current_value WHERE asset_class = 'precious_metals'
  → INSERT valuation_snapshots for changed rows
All consumers (dashboard, ledger, tier, analytics) read updated current_value
```

---

## v1.3 Architecture — Crypto Asset Tracking

### Problem Statement

Crypto assets currently exist as `asset_class = 'crypto'` with a manually typed `current_value`.
v1.3 replaces that with quantity × spot price computation — consistent with the metals pattern
established in v1.2. Three asset types must be handled:

| Type | Example | Valuation Source |
|------|---------|-----------------|
| Native crypto | XMR | `crypto_spot_prices`: EUR per coin × qty |
| Gold-backed token | PAXG, XAUT | `spot_prices` XAU path: qty_oz × 31.1035 × xau_per_gram |
| Manual fallback | Anything without a spot entry | `current_value` unchanged (backwards compat) |

---

## Database Changes (v1.3)

### Migration 022 — `crypto_asset_fields` (ALTER TABLE assets)

Adds three nullable columns to `assets`. Nullable because existing precious metals rows must
not break. No backfill required — new rows fill them on creation via AssetModal.

```typescript
// api/migrations/022_crypto_asset_fields.ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('assets', (table) => {
    table.string('coin_symbol', 20).nullable();   // 'XMR', 'PAXG', 'XAUT', 'BTC'
    table.string('coin_name', 100).nullable();    // 'Monero', 'Pax Gold', 'Tether Gold'
    table.string('custody_type', 30).nullable();  // 'exchange'|'hot_wallet'|'hardware_wallet'|'paper_wallet'|'custodian'
  });
}
export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('assets', (table) => {
    table.dropColumn('coin_symbol');
    table.dropColumn('coin_name');
    table.dropColumn('custody_type');
  });
}
```

**Why `custody_type` on `assets` not `asset_locations`:**
- A location can hold mixed physical + crypto (e.g. Ledger device in the same safe as bullion)
- Custody type is "how this asset is held", not "where the physical location is"
- Directly maps to Tier 3 sovereign risk scoring

### Migration 023 — `crypto_spot_prices` (CREATE TABLE)

Separate table from `spot_prices` because:
- Different unit: EUR per *coin* (whole unit, variable price) vs EUR per *gram* (weight-derived)
- Different symbol space: tickers ('XMR', 'BTC') vs metal names ('gold', 'silver')
- PAXG/XAUT intentionally excluded — they use the `spot_prices` XAU path

```typescript
// api/migrations/023_crypto_spot_prices.ts
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('crypto_spot_prices', (table) => {
    table.increments('id').primary();
    table.string('symbol', 20).notNullable();              // 'XMR', 'BTC', 'ETH' — NOT PAXG/XAUT
    table.decimal('price_per_unit', 20, 8).notNullable();  // EUR per 1 full coin
    table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(
    'CREATE INDEX idx_crypto_spot_symbol_recorded ON crypto_spot_prices(symbol, recorded_at DESC)'
  );
}
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('crypto_spot_prices');
}
```

**"Latest price per symbol" canonical query** (mirrors `spot_prices` pattern):
```sql
SELECT DISTINCT ON (symbol) symbol, price_per_unit, recorded_at
FROM crypto_spot_prices
ORDER BY symbol, recorded_at DESC;
```

### Migration Sequence Summary

| # | File | Type | Milestone |
|---|------|------|-----------|
| 020 | `020_location_insurance.ts` | ALTER asset_locations | ✅ v1.1 shipped |
| 021 | `021_spot_prices.ts` | CREATE spot_prices | v1.2 planned |
| 022 | `022_crypto_asset_fields.ts` | ALTER assets | v1.3 new |
| 023 | `023_crypto_spot_prices.ts` | CREATE crypto_spot_prices | v1.3 new |

**Note on acquisition quantity precision:** Acquisitions currently use `DECIMAL(20,6)`. Crypto
quantities like XMR are commonly traded to 4–5 decimal places (e.g. 14.75280 XMR). DECIMAL(20,6)
is sufficient — no migration needed. If sub-milliunit precision ever becomes required, add
`024_acquisition_qty_precision.ts` as an ALTER COLUMN, but do not add it speculatively.

---

## API Changes (v1.3)

### New File: `api/src/routes/cryptoSpotPrices.ts`

Prefix: `/api/crypto-spot-prices`

Structurally mirrors `spotPrices.ts` established in v1.2.

```
GET  /api/crypto-spot-prices/latest     — DISTINCT ON (symbol) per symbol
GET  /api/crypto-spot-prices            — full history, optional ?symbol= filter
POST /api/crypto-spot-prices            — insert { symbol, price_per_unit }
```

No DELETE / UPDATE endpoints — append-only, same pattern as `spot_prices`.

### Modified File: `api/src/routes/valuation.ts` (v1.2 file, extended in v1.3)

Extend `POST /api/valuation/recalculate` with two additional branches.

**Complete branch logic (all four branches):**

```typescript
// POST /api/valuation/recalculate

await knex.transaction(async trx => {

  // ── Branch 1: Precious metals ─────────────────────────────────────────────
  // value = SUM(qty) × toGrams(weight_per_unit, weight_unit) × spot_per_gram
  // spot_per_gram: DISTINCT ON metal FROM spot_prices WHERE metal = sub_class
  // (existing v1.2 logic — unchanged)

  // ── Branch 2: Gold-backed tokens (PAXG, XAUT) ────────────────────────────
  // Condition: asset_class = 'crypto' AND sub_class = 'gold'
  // Convention: acquisitions.quantity stored as troy oz (1 token = 1 troy oz)
  // value = SUM(qty_oz) × 31.1035 × xau_spot_per_gram
  const xauSpot = await trx('spot_prices')
    .where('metal', 'gold')
    .orderBy('recorded_at', 'desc')
    .first();

  if (xauSpot) {
    const goldCryptoAssets = await trx('assets')
      .where({ asset_class: 'crypto', sub_class: 'gold' });
    for (const asset of goldCryptoAssets) {
      const [{ total_qty }] = await trx('acquisitions')
        .where('asset_id', asset.id).sum({ total_qty: 'quantity' });
      const value = parseFloat(total_qty ?? '0') * 31.1035 * parseFloat(xauSpot.price_per_gram);
      await trx('assets').where('id', asset.id).update({ current_value: value });
      await trx('valuation_snapshots').insert({ asset_id: asset.id, value });
    }
  }
  // Guard: if no XAU spot price yet, gold-backed assets silently skipped (value preserved)

  // ── Branch 3: Native crypto (XMR, BTC, ETH, etc.) ────────────────────────
  // Condition: asset_class = 'crypto' AND sub_class != 'gold' AND coin_symbol IS NOT NULL
  // value = SUM(qty) × price_per_unit from crypto_spot_prices (latest per symbol)
  // Fallback: if no spot entry for symbol → skip (preserve existing current_value)
  const latestCryptoPrices = await trx.raw(`
    SELECT DISTINCT ON (symbol) symbol, price_per_unit
    FROM crypto_spot_prices
    ORDER BY symbol, recorded_at DESC
  `);
  const priceMap: Record<string, string> = Object.fromEntries(
    latestCryptoPrices.rows.map((r: any) => [r.symbol, r.price_per_unit])
  );

  const nativeCryptoAssets = await trx('assets')
    .where('asset_class', 'crypto')
    .whereNot('sub_class', 'gold')
    .whereNotNull('coin_symbol');

  for (const asset of nativeCryptoAssets) {
    const spotPrice = priceMap[asset.coin_symbol];
    if (!spotPrice) continue;  // No price entry — NEVER zero out; leave current_value unchanged
    const [{ total_qty }] = await trx('acquisitions')
      .where('asset_id', asset.id).sum({ total_qty: 'quantity' });
    const value = parseFloat(total_qty ?? '0') * parseFloat(spotPrice);
    await trx('assets').where('id', asset.id).update({ current_value: value });
    await trx('valuation_snapshots').insert({ asset_id: asset.id, value });
  }

  // ── Branch 4: Everything else ─────────────────────────────────────────────
  // Skip — current_value managed manually (real estate, cash, exotics, etc.)
});
```

### Modified File: `api/src/routes/index.ts`

```typescript
import cryptoSpotPricesRouter from './cryptoSpotPrices';
app.use('/api/crypto-spot-prices', cryptoSpotPricesRouter);
```

### Unchanged API Files (v1.3)

| File | Why untouched |
|------|--------------|
| `api/src/routes/assets.ts` | Generic `insert(req.body)` / `update(req.body)` already accepts any columns; new fields pass through automatically |
| `api/src/routes/dashboard.ts` | Reads `current_value` from assets — recalculate keeps this field current |
| `api/src/routes/ledger.ts` | Same |
| `api/src/routes/tierConfig.ts` | Same |

---

## Frontend Changes (v1.3)

### Modified File: `frontend/src/types.ts`

```typescript
// Add CustodyType union
export type CustodyType =
  | 'exchange'
  | 'hot_wallet'
  | 'hardware_wallet'
  | 'paper_wallet'
  | 'custodian';

// Extend Asset interface (add 3 fields)
export interface Asset {
  // ... all existing fields ...
  coin_symbol: string | null;      // 'XMR', 'PAXG', 'XAUT', 'BTC'
  coin_name: string | null;        // 'Monero', 'Pax Gold', 'Tether Gold'
  custody_type: CustodyType | null;
}

// New type: CryptoSpotPrice
export interface CryptoSpotPrice {
  id: number;
  symbol: string;
  price_per_unit: string;   // NUMERIC as string (pg driver)
  recorded_at: string;
  created_at: string;
}
export type CreateCryptoSpotPrice = Pick<CryptoSpotPrice, 'symbol' | 'price_per_unit'>;
```

`LedgerRow` does not need changes — it joins `assets.*` which will automatically include new columns once the migration runs.

### Modified File: `frontend/src/api.ts`

```typescript
export const cryptoSpotPrices = {
  latest: () => request<CryptoSpotPrice[]>('/api/crypto-spot-prices/latest'),
  list:   () => request<CryptoSpotPrice[]>('/api/crypto-spot-prices'),
  create: (body: CreateCryptoSpotPrice) =>
    request<CryptoSpotPrice>('/api/crypto-spot-prices', { method: 'POST', body }),
};
```

### Modified File: `frontend/src/components/modals/AssetModal.tsx`

Show crypto-specific fields conditionally when `asset_class === 'crypto'`:

| Field | Type | Behavior |
|-------|------|----------|
| `coin_symbol` | text input | Uppercase; e.g. "XMR", "PAXG" |
| `coin_name` | text input | Display name; e.g. "Monero", "Pax Gold" |
| `custody_type` | select | exchange / hot_wallet / hardware_wallet / paper_wallet / custodian |
| `sub_class` (existing) | select or text | For crypto: label "Token type"; gold-backed → 'gold', native → leave null |

Auto-hint logic:
- If `coin_symbol` is 'PAXG' or 'XAUT': auto-set `sub_class = 'gold'` + show "Uses XAU spot price"
- Otherwise: show "Uses crypto spot price (enter EUR/coin in spot prices section)"
- Acquisition form hint for PAXG/XAUT: "Quantity in troy oz — 1 token = 1 troy oz"

### New UI Section: Crypto Spot Price Management

**Location:** Inside the v1.2 spot price management screen (ValuationPage or dedicated section),
not a standalone page. Add a "Crypto Prices" panel beneath the metals panel.

```
[Metals Spot Prices] panel  (v1.2)
  XAU  €82.00/g  [last updated: 2026-04-10]
  XAG  €0.91/g   [last updated: 2026-04-10]
  ...

[Crypto Spot Prices] panel  (v1.3)
  XMR  €127.40/coin  [last updated: 2026-04-13]  ← new
  [+ Add price]  [symbol input] [EUR/coin input] [Save]
```

### Screens Gaining Crypto Values (Zero Code Changes)

After `POST /api/valuation/recalculate` propagates `current_value`, the following screens
automatically reflect correct crypto values — no code changes needed:

| Screen | Mechanism |
|--------|-----------|
| `DashboardPage.tsx` — net worth | `dashboard.ts /summary` sums `current_value` across all assets |
| `DashboardPage.tsx` — by-class | `by_asset_class` groups include the `crypto` class row |
| `LedgerPage.tsx` — value column | reads `asset_current_value` (joined `current_value`) |
| `TierPage.tsx` — Tier 3 weight | tier math sums `current_value` per tier |
| `AnalyticsPage.tsx` — allocation % | reads same `current_value` |

---

## PAXG / XAUT Valuation Branch — Fully Defined

```
Asset record fields for PAXG or XAUT:
  asset_class     = 'crypto'        (existing enum value)
  sub_class       = 'gold'          ← BRANCH TRIGGER for the gold-backed path
  coin_symbol     = 'PAXG'|'XAUT'   (display only; NOT used for price lookup)
  coin_name       = 'Pax Gold'|'Tether Gold'
  weight_per_unit = NULL             (not used; token-to-oz is fixed at 1:1)
  weight_unit     = NULL             (not used)
  custody_type    = user's choice    ('exchange'|'hot_wallet'|'hardware_wallet'...)

Acquisition records:
  quantity   = troy oz held          ← 1 token = 1 troy oz = 31.1035 g
  cost_basis = EUR paid at purchase

Valuation formula:
  quantity_oz  = SUM(acquisitions.quantity) WHERE asset_id = ?
  xau_per_gram = latest row FROM spot_prices WHERE metal = 'gold'
  current_value = quantity_oz × 31.1035 × xau_per_gram

Example (2 PAXG, XAU spot = €82.00/g):
  current_value = 2 × 31.1035 × 82.00 = €5,101.17

Branch discriminator in code:
  asset_class === 'crypto' && sub_class === 'gold'
  → use spot_prices WHERE metal = 'gold'
  → PAXG/XAUT NEVER appear in crypto_spot_prices table
```

**Disambiguation by sub_class:**

| sub_class value | Path | Example assets |
|----------------|------|---------------|
| `'gold'` | Gold-backed: spot_prices(gold) × 31.1035 × qty_oz | PAXG, XAUT |
| `NULL` | Native crypto: crypto_spot_prices(coin_symbol) × qty | XMR (no sub_class set) |
| any other value | Native crypto: crypto_spot_prices(coin_symbol) × qty | BTC, ETH |

---

## Data Flow Diagram (v1.3 Complete)

```
Manual input via UI
        │
        ├──► POST /api/spot-prices            ──► spot_prices table
        │    (metals: XAU, XAG, XPT, XPD)         (metal, price_per_gram)
        │
        └──► POST /api/crypto-spot-prices     ──► crypto_spot_prices table
             (native crypto: XMR, BTC, ETH)        (symbol, price_per_unit)
             NOT PAXG/XAUT

POST /api/valuation/recalculate
        │
        ├── Branch 1: asset_class = 'precious_metals'
        │   value = qty × to_grams(weight) × spot_prices(sub_class)
        │
        ├── Branch 2: asset_class = 'crypto' AND sub_class = 'gold'   ← PAXG, XAUT
        │   value = qty_oz × 31.1035 × spot_prices(metal='gold')
        │   Guard: no XAU entry → skip (preserve current_value)
        │
        ├── Branch 3: asset_class = 'crypto' AND sub_class ≠ 'gold' AND coin_symbol set
        │   value = qty × crypto_spot_prices(symbol)                   ← XMR, BTC
        │   Guard: no symbol entry → skip (preserve current_value)
        │
        └── Branch 4: all other asset classes → skip (manual current_value)
                │
                ▼
      UPDATE assets.current_value  +  INSERT valuation_snapshots
                │
                ▼
  All existing consumers read updated field:
    /api/dashboard/summary   → net worth total, by-class breakdown
    /api/dashboard/history   → history chart (via valuation_snapshots)
    /api/ledger              → value column
    /api/tier-config         → Tier 3 allocation %
    /api/valuation/summary   → total + premium decomp (v1.2)
    /api/valuation/breakdown → per-asset detail (v1.2)
```

---

## Build Order (Dependency Graph)

Each wave can be parallelised internally. Waves must be sequential.

```
Wave 1 — Database (no dependencies on anything else)
  022_crypto_asset_fields.ts     ADD coin_symbol, coin_name, custody_type to assets
  023_crypto_spot_prices.ts      CREATE TABLE crypto_spot_prices

Wave 2 — API (depends on Wave 1 migrations)
  api/src/routes/cryptoSpotPrices.ts  (new)    GET latest, GET list, POST create
  api/src/routes/valuation.ts         (extend) Add Branch 2 + Branch 3 to recalculate
  api/src/routes/index.ts             (modify) Mount cryptoSpotPricesRouter

Wave 3 — TypeScript Types + API Client (depends on Wave 2 API contracts)
  frontend/src/types.ts  (modify)    CustodyType, CryptoSpotPrice; extend Asset
  frontend/src/api.ts    (modify)    cryptoSpotPrices.* namespace

Wave 4 — Asset Management UI (depends on Wave 3 types)
  frontend/src/components/modals/AssetModal.tsx  (modify)
    coin_symbol, coin_name, custody_type fields (crypto-conditional)
    PAXG/XAUT auto-sets sub_class='gold' + shows XAU hint

Wave 5 — Crypto Spot Price UI (depends on Wave 3 types)
  New "Crypto Prices" panel inside v1.2 spot price management section
  Trigger: POST /api/valuation/recalculate includes crypto branches

Wave 6 — Verification
  Create XMR asset → enter XMR spot → recalculate → verify Dashboard + Ledger + Tier
  Create PAXG asset (sub_class='gold') → verify XAU spot is used, not crypto_spot_prices
  Existing PM assets: verify recalculate still works correctly (no regression)
```

**Critical ordering constraint:** AssetModal (Wave 4) must not ship before types.ts (Wave 3).
The `CustodyType` type must exist in `Asset` before the modal compiles cleanly.

**DashboardPage, LedgerPage, TierPage, AnalyticsPage: zero dedicated waves needed.**
They become passively correct after Wave 2 recalculate extension + first user-triggered
recalculate. No code changes, no sprint allocation.

---

## Integration Points — Exact File Paths

### New Files (v1.3)

| File | Purpose |
|------|---------|
| `api/migrations/022_crypto_asset_fields.ts` | ADD COLUMN coin_symbol, coin_name, custody_type to assets |
| `api/migrations/023_crypto_spot_prices.ts` | CREATE TABLE crypto_spot_prices |
| `api/src/routes/cryptoSpotPrices.ts` | GET/POST route for crypto_spot_prices |

### Modified Files (v1.3)

| File | Change summary |
|------|---------------|
| `api/src/routes/valuation.ts` | Extend recalculate with Branch 2 (PAXG/XAUT) + Branch 3 (XMR/BTC) |
| `api/src/routes/index.ts` | Mount `cryptoSpotPricesRouter` at `/api/crypto-spot-prices` |
| `frontend/src/types.ts` | Add `CustodyType`, `CryptoSpotPrice`, `CreateCryptoSpotPrice`; extend `Asset` |
| `frontend/src/api.ts` | Add `cryptoSpotPrices` namespace |
| `frontend/src/components/modals/AssetModal.tsx` | Crypto-conditional fields + PAXG/XAUT hint logic |
| v1.2 spot price UI section | Add Crypto Prices panel (sub-section addition, not a new file) |

### Untouched Files (v1.3)

| File | Reason |
|------|--------|
| `api/src/routes/assets.ts` | `insert(req.body)` / `update(req.body)` are already column-agnostic |
| `api/src/routes/dashboard.ts` | Reads `current_value` — passively correct after recalculate |
| `api/src/routes/ledger.ts` | Same |
| `api/src/routes/tierConfig.ts` | Same |
| `frontend/src/pages/DashboardPage.tsx` | Gets crypto values automatically |
| `frontend/src/pages/LedgerPage.tsx` | Same |
| `frontend/src/pages/TierPage.tsx` | Same |
| `frontend/src/pages/AnalyticsPage.tsx` | Same |
| All migrations 001–021 | Never modify existing migrations |

---

## Architecture Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| PAXG/XAUT created with `sub_class` not equal to `'gold'` → routed to native crypto path, finds no price entry | Medium | AssetModal: if `coin_symbol` is 'PAXG' or 'XAUT', auto-set `sub_class = 'gold'` and display warning |
| PAXG/XAUT quantity entered as token count (integer) instead of troy oz — they are the same, but user confusion risk | Low | Acquisition form hint: "For PAXG/XAUT: 1 token = 1 troy oz — enter number of tokens" |
| `spot_prices` has no XAU entry when recalculate runs (v1.2 data not set up yet) | Low | Branch 2 checks `if (xauSpot)` and skips silently — gold-backed assets retain existing `current_value` |
| Recalculate triggered before any crypto spot price entered → native crypto `current_value` remains at manual amount | Low | Branch 3 guard: `if (!spotPrice) continue` — NEVER zeros out existing value; backwards compatible |
| `DISTINCT ON` returns incorrect row if index missing | Low | Index on `(symbol, recorded_at DESC)` is explicitly created in migration 023 — not left to chance |
