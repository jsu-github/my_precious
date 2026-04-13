# Pitfalls Research — v1.1

**Domain:** Precious metals wealth dashboard — adding dealer prices + tier allocation  
**Researched:** 2026-04-11  
**Codebase baseline:** v1.0 (React 18 + Express + PostgreSQL + Knex, 70 files)  
**Confidence:** HIGH (all findings grounded in actual source files, not generic patterns)

---

## Critical Pitfalls

| # | Pitfall | Risk | Prevention | Phase |
|---|---------|------|------------|-------|
| C1 | `tier = 0` is falsy — Cash at Home silently treated as unassigned | Tier 0 assets show as "Unassigned", status + aggregation breaks | Never use `if (asset.tier)` — always `if (asset.tier != null)` | Tier Assignment |
| C2 | `weight_per_unit_grams` absent from ledger API SELECT | Liquidation column shows NaN with no error or warning | Add `'a.weight_per_unit_grams'` to the explicit SELECT list in `ledger.ts` | Dealer/Weight Ledger |
| C3 | `tier_config` seed INSERT is not idempotent | Migration crash on re-run: duplicate PK constraint violation | Use `.onConflict('tier_id').ignore()` or raw `ON CONFLICT DO NOTHING` | Tier Migration |
| C4 | Tier percentage denominator excludes NULL-tier assets — all tiers show ~0% on first use | Health tile shows "0 of 4 in range" until every asset is tagged; bad first run | Denominator = `SUM(current_value)` **across all assets**; tier value = filtered `WHERE tier = N` | Tier Aggregation |
| C5 | `tier` INT typed as `string` following NUMERIC convention in `types.ts` | `asset.tier === 2` never matches; all conditional rendering by tier breaks silently | `tier: number | null` — INT columns return as `number`, not `string`, from pg driver | Types |
| C6 | Tailwind dynamic class strings (e.g. `w-[${x}%]`) are build-time only | Range bar zones render at 0px width; bar appears flat/broken | Use `style={{ width: \`${x}%\` }}` for all dynamic layout values in the range bar | TierPage Range Bar |
| C7 | `renderPage()` in `App.tsx` silently returns `undefined` for new View case | Blank page on clicking Tier nav item; no console error, no TypeScript warning | Add `'tier'` to `View` union AND `case 'tier':` to the switch in the same change | Navigation |
| C8 | `routes/index.ts` not updated after creating new route file | New `/api/dealers` or `/api/tier-config` endpoints return 404 silently | After every new route file, immediately add import + `router.use()` to `routes/index.ts` | API Registration |

---

## Moderate Pitfalls

| # | Pitfall | Risk | Prevention | Phase |
|---|---------|------|------------|-------|
| M1 | `Number(e.target.value)` converts empty string `''` to `0` — conflating unassigned with Tier 0 | Creating a new asset sets `tier = 0` instead of `null` when user leaves tier blank | Use `e.target.value === '' ? null : Number(e.target.value)` in the onChange handler | AssetModal Tier Field |
| M2 | `ALTER TABLE assets ADD COLUMN` in migration fails if accidentally re-run (e.g., Knex metadata loss) | Migration startup crash; API won't start | Use `knex.raw('ALTER TABLE assets ADD COLUMN IF NOT EXISTS ...')` for all alter-add-column migrations | Migrations 010/011 |
| M3 | Range bar dot position clamped to [0, 100%] but value can exceed max — dot clips at edge | User cannot tell how far off-target an overallocated tier is | Clamp visual position to `[0, 100%]` for rendering; derive status color independently from logical value | TierPage Range Bar |
| M4 | `api.ts` not extended for new resources before writing components | Inline `fetch()` added to components, breaking codebase convention | Add `dealers` and `tierConfig` namespaces to `api.ts` before writing any component code | API Layer |
| M5 | Dashboard health tile computation approach not decided — two fetches overlap or conflict | Double network call, stale data, or coupling DashboardPage to tier logic it shouldn't own | Extend `GET /api/dashboard/summary` to include `tier_summary` field; keep component logic thin | Dashboard Tile |

---

## Minor Pitfalls

| # | Pitfall | Risk | Prevention | Phase |
|---|---------|------|------------|-------|
| L1 | Crypto assets have no `sub_class` — existing sub_class filter in Ledger shows blank row | "(none)" filter option appears, confuses user | Render `sub_class` as `—` when null; existing `?.` guards handle this without change | Crypto Assets |
| L2 | `sub_class` + `product_type` persist in `AssetModal` form state when `asset_class` changes | Saving a Crypto asset that was previously a gold bar still sends `sub_class: 'gold'` | Clear `sub_class` + `product_type` in the asset_class `onChange` handler | AssetModal |
| L3 | `tier_config` PATCH passes `req.body` directly to knex — non-numeric values accepted | `target_pct: "abc"` stored silently; status computation produces NaN | Validate `target_pct`, `min_pct`, `max_pct` are finite numbers at the route boundary | Tier Config API |
| L4 | `we_buy_gold` defaults to `0` not `NULL` — zero price looks like a valid low bid | User mistakes "unset" for "dealer buys at €0/g" | Store unset price as `NULL`; show `—` in UI when null, not `€0.00` | Dealer CRUD |
| L5 | Range bar target-% tick mark uses `left: ${target_pct}%` but bar domain isn't always [0, 100] | Tick mark renders outside bar bounds if max_pct > 100 or custom domain is used | Keep bar domain [0, 100] representing portfolio allocation space; tick position is always `${target_pct}%` | TierPage Range Bar |

---

## Phase-Specific Warnings

### Phase: Dealer Prices + Weight Column (Migration 010, dealers route, ledger update)

**C2 — Ledger route SELECT omission**  
The `/api/ledger` route (`api/src/routes/ledger.ts` L18–36) uses an explicit `.select(...)` list.
`weight_per_unit_grams` will NOT appear in responses until added to that list:

```typescript
// ❌ CURRENT — weight_per_unit_grams missing from SELECT
.select(
  'a.name as asset_name',
  'a.asset_class',
  'a.sub_class',
  'a.product_type',
  'a.current_value as asset_current_value',
  // ... missing weight
)

// ✅ REQUIRED — add this line
'a.weight_per_unit_grams',   // ← add to the explicit select list in ledger.ts
```

Also add `weight_per_unit_grams: string | null` to the `LedgerRow` interface in `types.ts`.
NUMERIC columns always come back as `string` from the pg driver — see the comment on line 1 of `types.ts`.

**M2 — ALTER TABLE idempotency**  
Migration 009's pattern (`alterTable` + `table.string().nullable()`) is NOT idempotent.
Follow this pattern instead for new column additions in migrations 010/011:

```typescript
// ✅ Use raw SQL with IF NOT EXISTS guard
await knex.raw(`
  ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS weight_per_unit_grams NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS tier INT
`);
```

**L4 — NULL vs 0 for unset dealer price**  
Define `we_buy_gold NUMERIC(12,4) NULLABLE` in the dealers table.
Liquidation computation guard — all three operands are NUMERIC strings from pg:

```typescript
// ✅ Handles null price and null weight — shows '—' not NaN
const liqValue =
  dealer?.we_buy_gold != null && asset.weight_per_unit_grams != null
    ? parseFloat(acq.quantity) * parseFloat(asset.weight_per_unit_grams) * parseFloat(dealer.we_buy_gold)
    : null;
```

---

### Phase: Tier Assignment (AssetModal field, types.ts, migration column)

**C1 — Tier 0 falsy trap**  
This is the highest-risk error for this feature.
Every location where tier is checked must use `!= null`, never truthiness:

```typescript
// ❌ WRONG — hides Tier 0 "Cash at Home"
if (asset.tier) { ... }
asset.tier || 'Unassigned'
const label = TIER_LABELS[asset.tier ?? 0]  // ?? 0 silently maps NULL → Tier 0

// ✅ CORRECT
if (asset.tier != null) { ... }
asset.tier !== null ? TIER_LABELS[asset.tier] : 'Unassigned'
```

**M1 — AssetModal select parses `''` as `0`**  
HTML selects always return string values via `e.target.value`. `Number('') === 0`.
The tier select must distinguish "nothing selected" (null) from "Tier 0 selected" (0):

```typescript
// ✅ Controlled select for nullable integer tier
<Select
  value={form.tier ?? ''}
  onChange={e => setForm(f => ({
    ...f,
    tier: e.target.value === '' ? null : Number(e.target.value),
  }))}
>
  <option value="">— Unassigned —</option>
  <option value="0">0: Cash at Home</option>
  <option value="1">1: Digital Bank</option>
  <option value="2">2: Physical Gold Vault</option>
  <option value="3">3: Crypto</option>
</Select>
```

**C5 — `tier` type in `types.ts`**  
The file header warns NUMERIC columns come back as strings. INT does NOT follow this rule.
`tier` must be typed `number | null`:

```typescript
// types.ts — inside Asset interface
tier: number | null;                   // INT — pg driver returns number, not string
weight_per_unit_grams: string | null;  // NUMERIC — pg driver returns string
```

**L2 — Stale sub_class when switching asset_class to crypto**  
`AssetModal` currently keeps `sub_class` and `product_type` in form state across `asset_class`
changes. Clear them on asset_class change:

```typescript
onChange={e => setForm(f => ({
  ...f,
  asset_class: e.target.value as AssetClass,
  sub_class: null,
  product_type: null,
}))}
```

---

### Phase: Tier Configuration + tier_config Migration

**C3 — Seed INSERT idempotency**  
`createTableIfNotExists` protects the CREATE step only. The seed INSERT needs its own guard:

```typescript
// ✅ Idempotent seed — Knex fluent API (requires Knex >= 0.21)
await knex('tier_config')
  .insert([
    { tier_id: 0, label: 'Cash at Home',       target_pct: 2,  min_pct: 0,  max_pct: 5  },
    { tier_id: 1, label: 'Digital Bank',        target_pct: 8,  min_pct: 4,  max_pct: 12 },
    { tier_id: 2, label: 'Physical Gold Vault', target_pct: 70, min_pct: 60, max_pct: 80 },
    { tier_id: 3, label: 'Crypto',              target_pct: 20, min_pct: 10, max_pct: 30 },
  ])
  .onConflict('tier_id')
  .ignore();
```

**L3 — Tier config PATCH input validation**  
The existing assets PATCH route passes `req.body` directly to knex — acceptable for text fields,
but tier config values drive numeric status computation. Add boundary validation:

```typescript
// api/routes/tierConfig.ts
const { target_pct, min_pct, max_pct } = req.body;
if (
  !isFinite(Number(target_pct)) ||
  !isFinite(Number(min_pct)) ||
  !isFinite(Number(max_pct))
) {
  return res.status(400).json({ error: { message: 'Tier config values must be numeric', status: 400 } });
}
```

---

### Phase: TierPage (range bar, allocation, status badges)

**C4 — Tier percentage denominator**  
After migration, ALL 20 existing assets have `tier = NULL`. The naive grouping query returns a
`tier = NULL` row containing the entire portfolio value, making all 4 tiers show 0%.

```sql
-- ❌ WRONG — tier_pct computed against tagged-only denominator
SELECT tier, SUM(current_value)
FROM assets
GROUP BY tier
-- Then: pct = tier_value / SUM(tagged_value)  ← inflated if most assets are untagged

-- ✅ CORRECT — two queries, total denominator includes everything
-- Query 1: total portfolio (all assets, including untagged)
SELECT SUM(current_value) as total FROM assets WHERE entity_id = ?

-- Query 2: per-tier value (tagged assets only)
SELECT tier, SUM(current_value) as tier_value
FROM assets
WHERE tier IS NOT NULL AND entity_id = ?
GROUP BY tier

-- pct = tier_value / total  ← denominator is full portfolio
```

Show a "X assets untagged" warning at the top of TierPage until all assets have a tier assigned.
This prevents the misleading "0% in Tier 2 (target 70%)" experience on first use.

**C6 — Tailwind dynamic classes**  
All range bar positions must use `style`. Tailwind cannot generate classes from runtime values:

```tsx
// ❌ WRONG — Tailwind scans at build time, these classes will not exist in the CSS
<div className={`w-[${minPct}%] bg-surface-high`} />
<div className={`left-[${currentPct}%] absolute`} />

// ✅ CORRECT — inline style for all dynamic widths and positions
<div style={{ width: `${belowMinWidth}%` }} className="bg-surface-high h-full" />
<div
  style={{ left: `${clampedPositionPct}%` }}
  className="absolute w-2 h-2 -translate-x-1/2 rounded-full bg-primary"
/>
```

**M3 — Dot position clipping vs color independence**  
A tier at 85% allocation (far above a 75% max) must show RED. Clamp visual position to the
bar's edge, but derive status color from the logical value:

```typescript
const totalRange = Math.max(maxPct + 10, 100);              // bar domain upper bound
const dotPct = Math.min(Math.max(currentPct / totalRange * 100, 0), 100);  // clamped visual
const status = deriveStatus(currentPct, minPct, maxPct);    // logical — not clamped
```

---

### Phase: Navigation + Sidebar (adding 'tier' View)

**C7 — Non-exhaustive switch in `renderPage()`**  
`View` is defined in `Sidebar.tsx` as a string union. `renderPage()` in `App.tsx` has no return
type annotation and no `never` guard — TypeScript will NOT error on a missing `case`:

```typescript
// ✅ All three changes must ship together in one commit:

// 1. Sidebar.tsx — extend the union
export type View = 'dashboard' | 'ledger' | 'analytics' | 'locations' | 'tax' | 'entity' | 'tier';

// 2. Sidebar.tsx NAV_ITEMS
{ id: 'tier', label: 'Sovereign Tiers', icon: Layers }

// 3. App.tsx renderPage()
import TierPage from './pages/TierPage';
// ...
case 'tier': return <TierPage entityFilter={entityFilter} />;
```

Shipping the type change without the `case` causes a blank page on Tier nav click — silent failure,
no TypeScript error, no runtime exception.

**C8 — `routes/index.ts` requires manual router registration**  
New route files are dead code until registered. TypeScript will not warn if this is omitted:

```typescript
// api/src/routes/index.ts — must add for each new route file
import dealersRouter from './dealers';
import tierConfigRouter from './tierConfig';
// ...
router.use('/dealers', dealersRouter);
router.use('/tier-config', tierConfigRouter);
```

---

### Phase: Dashboard Health Tile

**M5 — Choosing server-side vs client-side tier aggregation**  
Two valid approaches; the pitfall is mixing them or not deciding upfront.

**Option A: Extend `/api/dashboard/summary`** (preferred — consistent with existing pattern)
```typescript
// dashboard.ts — add tier summary alongside existing asset_class grouping
const tierRows = await knex('assets')
  .select(knex.raw('tier, SUM(current_value)::text as tier_value'))
  .modify(q => { if (entity_id) q.where('entity_id', entity_id); })
  .whereNotNull('tier')
  .groupBy('tier');
const total = totals.total_value;
// Attach to response as tier_summary: [{ tier, tier_value, pct }]
// Extend DashboardSummary type in types.ts
```

**Option B: Compute in DashboardPage from assets list**  
Only viable if DashboardPage already keeps the full assets list in state. If not, adding a
second `useEffect` to load assets creates a cascading fetch waterfall on the most-visited screen.

**Decision rule:** DashboardPage currently calls only `api.dashboard.summary()`. It does NOT
load the full assets list. → **Use Option A.** Extend the summary endpoint.

---

## Integration Checklist

Work through this before starting each phase:

- [ ] Any new `NUMERIC(x,y)` column → type as `string | null` in `types.ts` interface
- [ ] Any new `INT` column → type as `number | null` in `types.ts` interface (NOT string)
- [ ] Any ledger query change → update both `ledger.ts` SELECT list AND `LedgerRow` interface in `types.ts`
- [ ] Any new `View` variant → update `Sidebar.tsx` type + `NAV_ITEMS` + `App.tsx` switch in **one commit**
- [ ] Any new route file → registered in `routes/index.ts` before any testing
- [ ] Any migration with seed data → seed INSERT uses `ON CONFLICT (pk) DO NOTHING`
- [ ] Any range bar or dynamic layout percentage → `style={}` inline prop, never Tailwind dynamic class
- [ ] Any conditional check on `tier` → `!= null` not truthiness guard
- [ ] Any `Number(e.target.value)` for optional numeric field → guard empty string → `null`

---

## Preserved v1.0 Pitfalls (still relevant)

The following pitfalls from the v1.0 research remain applicable for v1.1 work:

- **P2 (Floating-point):** All new monetary columns (`we_buy_gold`, `weight_per_unit_grams`) must be `NUMERIC`, never `FLOAT`. Arithmetic in components must use `parseFloat()` on the string values the pg driver returns.
- **P3 (glass-panel performance):** TierPage cards and the dashboard health tile must use `bg-surface-container-low` (opaque) not `glass-panel`. Reserve `glass-panel` for overlay elements only.
- **P6 (Entity toggle re-render):** TierPage must accept `entityFilter` prop and filter tier aggregation by entity — consistent with all other pages. Do not store entity state locally in TierPage.

---

*Pitfalls research for: Precious Dashboard v1.1*  
*Researched: 2026-04-11*  
*Supersedes: v1.0 pitfalls (April 9, 2026)*

---

---

# Pitfalls Research — v1.2

**Domain:** Precious metals portfolio valuation additions — spot prices, dealer-derived values, premium decomposition, Valuation screen
**Researched:** 2026-04-13
**Codebase baseline:** v1.1 (shipped 2026-04-11) — 20 assets, 31 acquisitions, real portfolio data
**Confidence:** HIGH (all pitfalls grounded in direct source inspection of migrations, routes, and frontend utilities)

---

## Critical Pitfalls

---

### C1: `parseFloat()` Contamination Turns NUMERIC(20,2) Into JS Floats in Money Math

**What goes wrong:**
PostgreSQL returns all NUMERIC columns as strings via the `pg` driver. `getDealerRate()` (`metalPricing.ts`) already calls `parseFloat(dealer.we_buy_gold_per_gram)`. Chaining this with `weight_per_unit` (also a DB decimal string) and `quantity` (DECIMAL(20,6)) causes IEEE 754 drift at every multiplication. Example: `parseFloat("76.3500") * 31.1035 * parseFloat("1.000000")` → `2376.07725...` instead of `2376.08`. Premium computed from this propagates rounding errors into the per-acquisition decomposition — silent, undetectable, and wrong when totals are compared to accounting records.

**Why it happens:**
`getDealerRate()` and `toGrams()` were designed as display helpers — acceptable for rendering a liquidation estimate. But when these utilities are repurposed to feed persisted totals or premium calculations, the precision contract breaks. The functions have no documentation warning against this use.

**How to avoid:**
- Do all final money math as SQL `NUMERIC` arithmetic via `knex.raw()`: e.g., `ROUND(d.we_buy_gold_per_gram * a.weight_per_unit * acq.quantity, 2)`. PostgreSQL arithmetic stays exact.
- Where JS calculation is unavoidable (frontend-only display helpers), carry intermediate values as strings until the final `toFixed(2)` — never chain `parseFloat → parseFloat → *` across multiple fields.
- Add a comment to `metalPricing.ts`: "Display helpers only — do not use in persisted or aggregated financial calculations."

**Warning signs:**
- Sum of per-acquisition premiums ≠ asset-level premium by a few cents.
- Total metal value on Valuation page disagrees with a manual `spot × total_weight` cross-check.
- `premium` occasionally shows `−€0.01` on an acquisition that should be exactly zero.

**Phase to address:** First phase that introduces per-acquisition math — lock the precision contract before writing any aggregation logic.

---

### C2: Auto-Calculated `current_value` Silently Corrupts Dashboard Net Worth

**What goes wrong:**
`GET /api/dashboard/summary` does `SUM(assets.current_value)` as global net worth. Today, `current_value` is user-entered. If v1.2 auto-derives `current_value` from dealer price × weight × qty and writes it back to the `assets` row, two things break:

1. **Snapshot flood** — `PUT /api/assets/:id` already inserts into `valuation_snapshots` on every `current_value` change. Updating 20 assets when the default dealer's price is edited = 20 snapshot writes that appear in snapshot history as if the user manually revalued every asset.
2. **Manual override erasure** — Assets without dealer prices (crypto, real estate, future non-metals) would be silently overwritten to `0` if a bulk recalculation iterates all assets without filtering to `asset_class = 'precious_metals'`.

**Why it happens:**
`current_value` is a single column doing double duty: the dashboard's source of truth AND a manually editable field. Auto-calculation assumes a separation that doesn't exist yet in the schema.

**How to avoid:**
- Introduce a `calculated_value NUMERIC(20,2) NULLABLE` column alongside `current_value`. Dashboard query: `COALESCE(calculated_value, current_value)`.
- Alternatively, compute dealer-derived values live in the Valuation API without persisting — the Valuation page queries on the fly; the dashboard retains `current_value` as-is.
- **Never** write back to `current_value` from an automated price recalculation without an explicit user action ("Apply calculated values" button).
- A `value_source: 'manual' | 'calculated'` enum makes the distinction queryable and visible in the UI.

**Warning signs:**
- Global net worth changes after opening the Valuation page (the page triggered a recalc that wrote back).
- Crypto or real estate asset values jump to `0` after a metals price update.
- `valuation_snapshots` grows by 20 rows every time the default dealer price is edited.

**Phase to address:** Data model design phase — resolve this before any calculation logic writes to the DB. This is a pre-requisite constraint for all subsequent v1.2 phases.

---

### C3: Premium Computed Against Current Spot Instead of Acquisition-Time Spot

**What goes wrong:**
`premium = cost_basis − (weight × qty × spot)` is only meaningful if `spot` is the price at acquisition date. If you compute it with today's spot, the premium goes negative for any acquisition where the current spot price exceeds the historical purchase price — mathematically valid, but semantically wrong. It implies the user "paid negative premium," which is nonsensical and confusing.

There is no `spot_price_history` table planned. Only the current manually-entered spot price exists. This means every historical acquisition has its premium recomputed from today's spot on every page load, and the number changes daily.

**Why it happens:**
The feature brief says "manually enter XAU/XAG/XPT/XPD spot prices" (present tense, singular value) — implying a single current price, not a time series. This is an intentional scope constraint that creates a labeling problem downstream.

**How to avoid:**
- Be explicit in UI labeling: "Premium vs. current spot" — not "Premium paid" or "Numismatic premium."
- Add a `spot_at_acquisition NUMERIC(16,6) NULLABLE` column to the `acquisitions` table. Populate it when a new acquisition is entered (once spot prices exist). This enables a true "premium paid" calculation later without a v1.2 schema rewrite.
- On the Valuation page, the initial view shows "Metal value (today)" vs. "Cost basis" — framed as P&L, not premium decomposition.
- Add a visible info note: "Metal value uses today's [XAU/XAG/XPT] spot price."

**Warning signs:**
- Gold bar acquisitions showing large negative premiums after spot rose significantly.
- User asks "why does my premium change every week without me doing anything?"
- Total "premium" at portfolio level fluctuates daily as the user updates spot prices.

**Phase to address:** Valuation page design phase — lock the mental model and column labels before writing any premium column. The word "premium" must not appear in any v1.2 column header without a clear qualifier.

---

### C4: Null `weight_per_unit` Silently Zeroes Metal Value Without Error

**What goes wrong:**
Not all assets are guaranteed to have `weight_per_unit` set. Migration 017 ran a name-based backfill for known asset names — but any asset that didn't exactly match the hardcoded name list (typos, renamed assets, import discrepancies) has `weight_per_unit = NULL`.

In JavaScript: `null * 1 * 95.00 = 0`. Metal value for that asset = `0`. Premium = `cost_basis − 0 = cost_basis` (100% apparent premium). The bug is invisible: no error is thrown, no `null` is surfaced to the UI, the number `0` passes every check.

**Why it happens:**
`weight_per_unit` is `NULLABLE` (correct — not all assets are weighted metals). The calculation path has no guard: `toGrams(asset.weight_per_unit, asset.weight_unit)` returns `0` when `weight_per_unit` is null because `null * 31.1035 = 0` in JS.

**How to avoid:**
- `toGrams()` must return `null` (not `0`) when `weight` is null: `if (weight == null) return null`.
- All metal value calculations must propagate `null` when weight is null — guard: `if (metalValue == null) skip this asset`.
- Valuation page must show a visible "N assets excluded — missing weight data" callout with a link to edit assets.
- API endpoint for valuation returns `metal_value: null` (not `0`) when weight is null so the frontend can distinguish "zero value" from "uncomputable."

**Warning signs:**
- Total metal value for the portfolio is lower than the sum you'd calculate manually from known weights.
- Any gold bar shows `premium_pct ≈ 100%` (all cost, no metal base).
- Dividing by metal value to compute premium percentage hits `Infinity` or `NaN`.

**Phase to address:** Whichever phase introduces `toGrams()` into production calculation paths — patch the null return value as the very first change.

---

### C5: LedgerPage Proportional P&L Diverges from Valuation Page P&L Without Warning

**What goes wrong:**
`buildEnrichedRows()` in `LedgerPage.tsx` allocates `asset.current_value` across acquisitions proportionally by `cost_basis` fraction:
```
proportion = acquisition.cost_basis / sum(all_cost_bases for this asset)
currentValue = proportion × asset.current_value
roi = currentValue − cost_basis
```
If v1.2 introduces a new "dealer value" calculation path on the Valuation page without updating `current_value`, the Ledger shows ROI based on `current_value` (manual) while the Valuation page shows P&L based on `dealer_value` (calculated). The same asset shows two different P&L numbers on two different screens — a contradiction the user will notice and find alarming.

**Why it happens:**
Both pages consume a "current value" concept independently. There is no single source-of-truth resolver function shared across pages. The mismatch is invisible during development when pages are built in isolation.

**How to avoid:**
- Before shipping the Valuation page, add a cross-page P&L consistency check to the implementation criteria: `sum(Ledger.roi for assetX) === Valuation.unrealizedPnL for assetX`.
- Centralize the "effective value" resolver: either a DB view (`effective_value = COALESCE(dealer_value, current_value)`), an API-level resolved field, or a shared frontend utility. All pages consume this one field.
- If the two views intentionally show different values (manual vs. calculated), make that explicit in each page's header — "based on manual value" vs. "based on dealer price."

**Warning signs:**
- Ledger shows +€4,200 ROI; Valuation shows +€4,800 for the same asset on the same day.
- After editing a dealer price, LedgerPage ROI column changes unexpectedly.
- User's `current_value` in the Edit Asset modal differs from what Valuation page shows as dealer value.

**Phase to address:** Valuation page phase — define the value source contract before writing P&L logic.

---

### C6: Entity Filter Not Wired Into New Valuation Page

**What goes wrong:**
Every existing page (Dashboard, Ledger, TierPage, Analytics, Locations, Tax, Entity) accepts `entityFilter` as a prop and filters data accordingly. Entity separation is legally significant — Beheer B.V. and Privé assets must never be co-mingled in single-entity views. A Valuation page that forgets to wire `entityFilter` always shows combined totals regardless of the entity picker selection. This is a silent data leak of personal assets into business reporting context.

**Why it happens:**
The `entityFilter` prop is convention-based (not enforced by TypeScript). New pages receive it only if the developer remembers to pass it from `AppShell.tsx` and add it to the page's API calls. It's easy to omit when focus is on calculation logic.

**How to avoid:**
- Add `entityFilter: EntityFilter` to a shared `PageProps` interface in `types.ts` — all page components must implement it, making omission a TypeScript error.
- The Valuation API endpoint must accept `?entity_id=N` from day one, consistent with all other endpoints.
- Wire `entityFilter` to the API call as the literal first line of implementation, before any calculation code.
- Test: switch entity picker to "Privé" — verify Valuation totals change and match only Privé assets.

**Warning signs:**
- Valuation total matches the combined Dashboard total even when "Privé" entity is selected.
- The valuation API call in the network tab has no `entity_id` query param.
- Total cost basis on Valuation page is double the assets-page sum for the selected entity.

**Phase to address:** Valuation page scaffold — wire entity filter before writing any data logic.

---

### C7: Hardcoded Default Dealer (HollandGold) Is Fragile After `make clean`

**What goes wrong:**
The feature brief says "calculate current value from default dealer (HollandGold)." There is no `is_default` flag on the `dealers` table. The system currently uses user-selected dealer state in the Ledger (UI-level). If the Valuation page hard-codes HollandGold by DB row ID or name string:
1. After `make clean` + re-seed, HollandGold may get a different `id` if seed order changes.
2. A `WHERE name = 'HollandGold'` lookup silently returns zero rows if the dealer name is ever edited.
3. When a second dealer is added, the "default" is still locked to HollandGold with no way to change it.

**Why it happens:**
No backend concept of "default dealer" was ever formalized — it exists only as user knowledge. The brief assumes a single default without modeling it.

**How to avoid:**
- Add `is_default BOOLEAN NOT NULL DEFAULT FALSE` to the `dealers` table via a new migration. The HollandGold seed migration sets this row to `is_default = TRUE`.
- API fallback: if no `is_default` row exists, use the first dealer with a non-null gold price.
- Valuation page eventually supports a "Compare dealers" toggle — start with default but make it swappable from the UI.
- Never reference a dealer by hardcoded `id` integer or `name` string in production route logic.

**Warning signs:**
- Valuation page shows `€0` or blank for all dealer values after `make clean`.
- Wrong prices appear after a new dealer is added.
- Any route file contains `WHERE name = 'HollandGold'` or `WHERE id = 1`.

**Phase to address:** Dealer table migration — when the `spot_prices` table is introduced, simultaneously add `is_default` to `dealers` so the Valuation page has a stable reference from day one.

---

### C8: `quantity` × `weight_per_unit` Axis Confusion — Weight Entered as Quantity

**What goes wrong:**
Weight lives on the asset (`weight_per_unit`, `weight_unit`). Quantity lives on the acquisition (`quantity` — how many units in that batch). Metal value = `weight_per_unit × toGrams() × quantity × spot`.

If a user imported an acquisition with `quantity = 100` intending to mean "100 grams" (treating quantity as total weight), AND the asset has `weight_per_unit = 100` (correctly, for a 100g bar), the computed metal value is `100g × 100 units × spot` — 100× the real value. No constraint prevents this. The import wizard (`ImportWizard.tsx`) had to infer these values from CSV columns where the semantic was ambiguous.

**Why it happens:**
The schema separates weight and quantity correctly, but the import path and user mental model may not. Migration 017's name-based backfill suggests some assets had weights inferred post-import. Any acquisition from that era may have ambiguous quantity semantics.

**How to avoid:**
- Pre-flight validation: for precious metal acquisitions, if `weight_per_unit × quantity > 10,000g` (≈ 321 troy oz), flag it as a data quality warning — not a block, but visible.
- Valuation page shows "Total weight" per asset row (sum of `weight_per_unit × quantity` across acquisitions) so the user can immediately spot impossible totals.
- Document in schema comments: "`quantity` = number of physical pieces; `weight_per_unit` = grams per piece."

**Warning signs:**
- A single acquisition shows metal value exceeding the entire portfolio's value.
- `dealer_value` for a silver bar position is 100× `current_value`.
- Total weight for a position is displayed as `3,110g` when the actual holding is ~`31.1g`.

**Phase to address:** Dealer-derived valuation phase — add the sanity check before any aggregate totals are surfaced.

---

## Moderate Pitfalls

---

### M1: N+1 Dealer Lookups When Valuation Aggregates Across All Acquisitions

**What goes wrong:**
A Valuation API endpoint that fetches acquisitions first, then fetches the associated asset per acquisition, then fetches the default dealer per metal type — creates an N+1 pattern invisible at 31 acquisitions but slow at scale.

**How to avoid:**
The existing `GET /api/ledger` query is the reference: a single JOIN across `acquisitions`, `assets`, `entities`, and `asset_locations`. The Valuation endpoint must follow the same pattern — one query joining `acquisitions JOIN assets JOIN dealers` with a `WHERE dealers.is_default = true` condition.

**Warning signs:** Valuation page response time > 500ms with fewer than 100 acquisitions.

**Phase to address:** Valuation API endpoint — copy the JOIN pattern from `ledger.ts` as the starting template.

---

### M2: `DECIMAL(10,4)` Dealer Prices × `DECIMAL(20,6)` Quantity — Round at the Right Step

**What goes wrong:**
`we_buy_gold_per_gram DECIMAL(10,4)` × `weight_per_unit DECIMAL(10,4)` × `quantity DECIMAL(20,6)` produces intermediate results with many decimal places. PostgreSQL handles this correctly in `NUMERIC` arithmetic, but if the result is placed into a `DECIMAL(20,2)` column without an explicit `ROUND(..., 2)`, PostgreSQL silently rounds. If the calculation is done in JS as `parseFloat × parseFloat × parseFloat`, values like `€8,441.7894560...` will round differently depending on whether `toFixed(2)` or `Math.round` is used.

**How to avoid:**
- Always close monetary calculations with `ROUND(expression, 2)` in SQL, or `.toFixed(2)` → `parseFloat` in frontend display.
- Test explicitly with a 100 troy oz silver bar (weight=100oz, qty=3, price=€0.90/g) — expect `€8,431.95`, verify the actual rendered value matches.

**Warning signs:** `numeric field overflow` error in API logs. Values ending in `...94` or `...06` when they should end in `...00`.

**Phase to address:** Spot price migration — define price columns as `NUMERIC(16,6)` matching existing dealer precision convention.

---

## Minor Pitfalls

---

### L1: `current_value` Edit in AssetModal Becomes Ambiguous Next to Calculated Values

**What goes wrong:**
Once the Valuation page shows a dealer-derived value alongside the manually editable `current_value`, users won't know if editing `current_value` in the modal permanently overrides the auto-calculated value or is ignored on next recalculation.

**How to avoid:**
If a `value_source` field exists, show inline in the modal: "(auto-calculated from dealer prices — this edit will become the manual override)." If not, add a static note: "Calculated automatically for precious metals with weight data."

**Phase to address:** AssetModal UX — after `value_source` semantics are finalized.

---

### L2: nl-NL Locale Formatting of Negative Premiums Varies Across Browsers

**What goes wrong:**
`Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(-500)` renders as `€ -500,00` in Chromium but `−€ 500,00` (with typographic minus) in some Firefox versions. A negative premium shown inconsistently looks like a layout bug.

**How to avoid:**
Use a dedicated `fmtPremium(value: number)` helper that treats negative values explicitly — e.g., wraps in red color class and prefixes explicitly with `−`. Don't rely on locale formatter sign placement for financial negative values.

**Phase to address:** Valuation page display components.

---

## Phase Assignment Summary — v1.2

| # | Pitfall | Severity | Phase to Address |
|---|---------|----------|-----------------|
| C1 | JS float contamination in money math | Critical | First phase with per-acquisition math |
| C2 | Auto-calc writes back to `current_value` | Critical | Data model design — pre-requisite for all v1.2 phases |
| C3 | Premium vs. wrong spot (labeling) | Critical | Valuation page design before any column headers |
| C4 | Null weight silently zeroes metal value | Critical | `toGrams()` patch + weight validation pre-flight |
| C5 | LedgerPage P&L diverges from Valuation P&L | Critical | Valuation page — define value source contract first |
| C6 | Entity filter not wired to Valuation page | Critical | Valuation page scaffold — wire before data logic |
| C7 | Hardcoded HollandGold dealer reference | High | Dealer migration — add `is_default` before Valuation page |
| C8 | Quantity × weight axis confusion | High | Dealer-derived valuation — sanity check guard |
| M1 | N+1 dealer lookups | Moderate | Valuation API endpoint — use JOIN from ledger.ts |
| M2 | Intermediate decimal rounding | Moderate | Spot price migration — ROUND() in SQL |
| L1 | AssetModal edit ambiguity | Low | AssetModal UX after value_source is defined |
| L2 | Negative premium nl-NL formatting | Low | Valuation page components |

---

*Pitfalls research for: Precious Dashboard v1.2 — Portfolio Valuation*
*Researched: 2026-04-13*
*Extends: v1.1 pitfalls (2026-04-11)*

---

---

# Pitfalls Research — v1.3

**Domain:** Crypto asset tracking (XMR, PAXG, XAUT) integrated into an existing precious metals portfolio dashboard
**Researched:** 2026-04-13
**Codebase baseline:** v1.1 shipped; v1.2 (Portfolio Valuation / spot prices) in progress
**Confidence:** HIGH — all pitfalls derived from direct codebase reads (migrations, routes, types.ts) and v1.2 integration analysis

---

## Critical Pitfalls

Mistakes that produce **silent wrong numbers** or require a schema rewrite to fix.

---

### C1: `DECIMAL(20,6)` silently truncates XMR quantities

**What goes wrong:**
`acquisitions.quantity` is `DECIMAL(20,6)` (migration 005). XMR (Monero) supports up to 12 decimal places (piconero precision = 10⁻¹²). A user entering `14.750000000001 XMR` will have it stored and read back as `14.750000`. The truncation is silent — PostgreSQL rounds without an error.

**Why it happens:**
The column was designed for fractional ounces of gold and silver — 6 decimals is correct for metals. Crypto sub-unit granularity was not a design consideration.

**Consequences:**
- Stored quantity is mathematically incorrect for sub-piconero entries
- The codebase comment in migration 005 says "NEVER float" — violating precision for crypto is inconsistent with that principle
- User loss: XMR quantities entered with high precision (hardware wallet balance export) are silently truncated

**Prevention:**
- Migration widens `acquisitions.quantity` to `DECIMAL(20,12)` — non-destructive, all existing rows stay valid
- **Critical:** Knex `alterTable` + `table.decimal()` cannot change column precision on an existing PostgreSQL column via the fluent API. Use raw SQL:
  ```sql
  ALTER TABLE acquisitions ALTER COLUMN quantity TYPE NUMERIC(20,12);
  ```
- Apply this migration before any v1.3 crypto acquisition is entered

**Detection warning:** No error is thrown — PostgreSQL rounds silently. Only detectable by comparing inserted value vs. read-back value in a migration test.

**Phase:** DB schema migration phase — first migration of v1.3.

---

### C2: Dashboard continues summing `assets.current_value` while v1.3 introduces computed crypto values

**What goes wrong:**
`dashboard.ts` does `SUM(current_value)` directly from the `assets` table. v1.2 is introducing computed metal values; v1.3 adds `qty × crypto_spot` for crypto. If these two milestones don't coordinate on a single "effective value" branch, the dashboard aggregate will be inconsistent — some asset classes read `current_value` (manual), others read a live computation, and the mix produces a total that nobody can verify against a manual cross-check.

**Why it happens:**
Both milestones need to modify the same aggregation endpoint. Without an explicit ownership handoff, v1.3 adds a patch on top of whatever state v1.2 left the endpoint in.

**Consequences:** Portfolio net worth is wrong. Entity toggle math (Beheer B.V. vs. Privé) is off. Tier allocation percentages use the wrong denominator.

**Prevention:**
- Before starting v1.3 valuation propagation, confirm the post-v1.2 state of dashboard.ts
- Define a single `effective_value(asset)` branching structure that is extended — not overwritten — by each milestone:
  - `precious_metals` → `qty × weight_per_unit × toGrams() × spot_per_gram`
  - `crypto`, `sub_class = 'gold'` (PAXG/XAUT) → `qty × 31.1035 × xau_spot_per_gram`
  - `crypto`, `sub_class ≠ 'gold'` (XMR etc.) → `qty × crypto_spot_per_unit` (fallback: `current_value`)
  - All other classes → `current_value` unchanged
- Implement as a SQL CTE so the branching lives in one place

**Phase:** Valuation integration phase — coordinate with v1.2 endpoint before writing any v1.3 aggregation.

---

### C3: PAXG/XAUT entered in `crypto_spot_prices` instead of routing through XAU

**What goes wrong:**
A developer or user enters PAXG/XAUT prices in the `crypto_spot_prices` table. The valuation code uses that token market price instead of the XAU spot from the `spot_prices` table. The two prices will diverge over time (gold ETF premium/discount fluctuation). The user's tokenized gold position no longer consolidates with their physical gold position.

**Why it happens:**
PAXG and XAUT have their own market prices (CoinGecko etc.). It is intuitive to put all crypto tickers in the crypto spot table. The gold-backed routing requires knowing that `sub_class = 'gold'` on a crypto asset is the branch condition.

**Consequences:**
- Combined gold oz exposure metric (physical + tokenized) is wrong, defeating the dashboard's primary differentiator
- PAXG/XAUT premium vs. XAU spot is undetectable — the two diverge silently
- Valuation screen shows tokenized gold value inconsistently with physical gold value

**Prevention:**
- Do not insert PAXG or XAUT rows into `crypto_spot_prices` — enforce at API layer with a validation check (reject any symbol that is in `['PAXG', 'XAUT']` — or more robustly: reject any symbol where the corresponding asset has `sub_class = 'gold'`)
- Valuation branch condition: `IF asset_class = 'crypto' AND sub_class = 'gold' THEN use spot_prices WHERE metal = 'XAU'`
- AssetModal: when `asset_class = 'crypto'` and `sub_class = 'gold'` is selected, show a note: "Value derived from XAU spot price — configure under Spot Prices, not Crypto Spot"
- Add a comment to the `crypto_spot_prices` table migration: "Gold-backed tokens (PAXG, XAUT) are excluded — they derive from xau_spot in the spot_prices table"

**Phase:** Valuation logic phase — include explicit branch test: verify a PAXG asset does not use `crypto_spot_prices`.

---

### C4: PAXG/XAUT quantity unit mismatch — troy oz vs. grams

**What goes wrong:**
1 PAXG = 1 XAUT = 1 fine troy oz of gold. `acquisitions.quantity` for these tokens must be stored in **troy oz** (token count = oz count). If someone stores quantity as grams (copying the metals pattern where `weight_unit = 'g'` is common), combined with the formula `qty × 31.1035 × xau_per_gram`, the result is `28g × 31.1035 × xau_per_gram` instead of `0.9oz × 31.1035 × xau_per_gram` — off by a factor of ~31.

**Why it happens:**
The `assets` table has `weight_per_unit` and `weight_unit` for physical metals. The temptation exists to set `weight_per_unit = 31.1035, weight_unit = 'g'` on PAXG/XAUT to "reuse the metals path." This breaks the clean branch between metals and crypto and produces the unit confusion.

**Consequences:** PAXG/XAUT value is ~31× overstated or ~0.032× understated depending on direction of unit error. This magnitude of error can pass a casual eyeball check on a small position.

**Prevention:**
- Canonical rule: for PAXG/XAUT, `acquisitions.quantity` = **number of tokens** (each token = 1 troy oz; no unit conversion needed in the acquisition row)
- Crypto assets MUST have `weight_per_unit = NULL` and `weight_unit = NULL` — these fields are for physical metals only
- The gold-backed valuation formula hardcodes `31.1035` (the troy-oz-to-grams constant), not `weight_per_unit`:
  ```sql
  -- PAXG/XAUT: qty (tokens = oz) × 31.1035 × xau_spot_per_gram
  SUM(acq.quantity) * 31.1035 * xau_spot.price_per_gram
  ```
- Add the convention as a migration comment AND a code comment in the valuation route

**Phase:** DB schema migration + valuation logic phase — add inline documentation.

---

### C5: Cartesian product from joining `crypto_spot_prices` without isolating the latest-price row

**What goes wrong:**
`crypto_spot_prices` is an append-only table (same pattern as `spot_prices`). A query that `JOIN`s to it without restricting to the latest row per symbol returns all historical rows. With 5 XMR price entries and 10 XMR acquisition rows, the join produces 50 intermediate rows. `SUM(qty × price)` is then 5× the correct value. The dashboard total is grossly overstated.

**Why it happens:**
The "latest price" requirement is easy to forget when writing a first JOIN. The bug is especially deceptive during early development when only one price row exists per symbol — everything appears correct until a second price is entered.

**Consequences:** Portfolio net worth is multiplied by the number of historical crypto price entries. Dashboard total doubles silently after each new spot price entry.

**Prevention:**
- Always isolate latest price per symbol using a CTE before joining:
  ```sql
  WITH latest_crypto AS (
    SELECT DISTINCT ON (symbol) symbol, price_per_unit
    FROM crypto_spot_prices
    ORDER BY symbol, recorded_at DESC
  ),
  latest_xau AS (
    SELECT DISTINCT ON (metal) metal, price_per_gram
    FROM spot_prices
    WHERE metal = 'XAU'
    ORDER BY metal, recorded_at DESC
  )
  -- JOIN latest_crypto / latest_xau to assets
  ```
- **Regression test:** Insert 3 XMR spot prices, verify dashboard total does not change after the 2nd and 3rd insertions
- Apply the same CTE discipline to the v1.2 `spot_prices` table — establish this as the house standard for all append-only price tables

**Phase:** Aggregation endpoint phase — first thing verified after connecting spot prices to any asset value.

---

## Moderate Pitfalls

Mistakes that cause **bad UX, silent fallbacks, or accumulating technical debt**.

---

### M1: `coin_symbol` nullable — silent missing-price fallback looks like working computation

**What goes wrong:**
`coin_symbol` is added to `assets` as a nullable VARCHAR (required to avoid breaking existing rows). A crypto asset created without a coin_symbol cannot look up its price. The fallback (`current_value`) fires silently. The user sees a non-zero EUR value from their old manual entry and believes prices are computing — when they are not.

**Prevention:**
- API validation: if `asset_class = 'crypto'`, require `coin_symbol` in the POST/PUT handler
- AssetModal: make `coin_symbol` a required field when `asset_class = 'crypto'`
- Add a UI indicator on the asset row / dashboard tile differentiating "computed" vs. "manual" value source
- Backfill existing crypto assets with `coin_symbol` before enabling computed values (the existing XMR asset has a known symbol)

**Phase:** AssetModal UI + API validation phase.

---

### M2: `price_per_unit` in `crypto_spot_prices` accidentally named `price_per_gram` by copy-paste

**What goes wrong:**
v1.2's `spot_prices` table schema: `(metal, price_per_gram, recorded_at)`. A developer building `crypto_spot_prices` by copying the migration accidentally names the price column `price_per_gram`. XMR is not priced per gram. The column name is semantically wrong and will cause confusion in every query and type that reads it.

**Why it happens:**
Structural similarity between the two tables encourages copy-paste. The distinction is semantic, not structural.

**Prevention:**
- `crypto_spot_prices` must use `price_per_unit` — verified in the migration file name and migration comment
- TypeScript types: `SpotPrice` (metals) and `CryptoSpotPrice` are separate interfaces — never unioned
- Add doc comment: `// price_per_unit: EUR per 1 full token (e.g. 1 XMR). NOT per gram. For gold-backed tokens use spot_prices.`

**Phase:** DB migration phase.

---

### M3: Migration number collision between v1.2 and v1.3

**What goes wrong:**
v1.2 is actively in progress and will consume migration numbers 021, 022, 023, etc. v1.3 planning writes migrations starting at 021 (the next available number today). After v1.2 is merged, v1.3 migration 021 collides with v1.2 migration 021. Knex skips already-applied migrations by filename — if the v1.2 migration 021 already ran, the v1.3 021 is silently skipped, leaving the schema incomplete.

**Why it happens:**
Both milestones planned simultaneously; migration numbers assigned by planning-time sequence, not execution-time sequence.

**Prevention:**
- v1.3 migration numbers must be assigned AFTER v1.2 is merged and its highest migration number is known
- Use placeholder numbers in planning docs (e.g. `02X_crypto_fields.ts`); assign real numbers at implementation time
- First action in v1.3 implementation: `ls api/migrations/ | tail -5` — verify highest existing number before creating any migration file

**Phase:** DB migration phase — first action.

---

### M4: Tier 3 allocation uses stale `current_value` — not the newly computed crypto value

**What goes wrong:**
`dashboard.ts` tier summary section does `SUM(current_value)` filtered by `tier`. If crypto value is now computed on-the-fly from spot prices and never written back to `current_value`, the Tier 3 allocation percentage remains based on the old manual entry. TierPage shows a wrong balance between Tier 2 (physical gold) and Tier 3 (crypto).

**Consequences:** The user's tier health indicators (green/amber/red) are wrong. A policy decision like "Tier 3 must not exceed 30%" operates on incorrect numbers.

**Prevention:**
- The effective-value computation (C2) must feed tier aggregation in dashboard.ts, not just the portfolio total
- Recommended approach: single SQL computation using CTEs — both total and per-tier groups resolve from the same effective_value expression
- Alternative: write computed crypto value back to `current_value` when spot price is saved — simpler but creates the snapshot flood problem from v1.2 pitfall C2. Only do this if the v1.2 approach decides to write back.

**Phase:** Dashboard aggregation + tier integration phase.

---

### M5: AssetModal form state contamination when switching `asset_class`

**What goes wrong:**
User starts creating a crypto asset, fills in `coin_symbol = 'XMR'`, `custody_type = 'hardware_wallet'`, then switches `asset_class` to `precious_metals`. React controlled components retain those hidden field values in state. On submit, the API receives `coin_symbol: 'XMR'` on a precious metals asset. Future crypto valuation joins may accidentally match this asset.

**Why it happens:**
Same pattern as v1.1 pitfall L2 (`sub_class` leaking across asset_class switches). The new crypto fields add 3 more collision vectors.

**Prevention:**
- On `asset_class` change handler: explicitly reset `coin_symbol → null`, `coin_name → null`, `custody_type → null`
- The submit handler should filter: only include `coin_symbol`, `coin_name`, `custody_type` in the PUT/POST body if `asset_class === 'crypto'`
- Consider `key={asset_class}` on the crypto-specific fieldset to force re-mount (nuclear option, but effective)

**Phase:** AssetModal UI extension phase.

---

### M6: Existing crypto `current_value` stops updating — user doesn't know why

**What goes wrong:**
The real portfolio has an existing XMR asset with a manually-entered `current_value`. After v1.3, that value is derived from `qty × spot`. But `current_value` is still editable in the AssetModal. If the user updates it manually, the edit either: (a) is overwritten on the next spot price save, or (b) persists as the fallback permanently if no spot price exists yet. Neither outcome is communicated to the user.

**Prevention:**
- When `coin_symbol` is set on a crypto asset, hide the `current_value` input in AssetModal — replace with a read-only computed value display
- Keep `current_value` as the API fallback (backwards compatible), but the UI should not surface it as editable when a spot price path exists
- On the spot prices management screen, add a note: "Saving a new price updates the computed value for all assets using this symbol"

**Phase:** AssetModal UX + fallback logic phase.

---

### M7: `weight_per_unit` set on crypto assets — contaminates "total metal weight" queries

**What goes wrong:**
If PAXG/XAUT are given `weight_per_unit = 31.1035, weight_unit = 'oz'` (to "help" the valuation math), any query that computes total physical gold weight by filtering on `weight_per_unit IS NOT NULL` will include tokenized gold tokens alongside physical bullion. A combined gold oz display becomes "physical + tokenized mixed" without surfacing the distinction.

**Why it happens:**
Reusing the metals valuation path for PAXG/XAUT seems like a DRY win. It is not — it blurs asset class semantics.

**Prevention:**
- Crypto assets must have `weight_per_unit = NULL` and `weight_unit = NULL` (enforced in AssetModal: hide weight fields when `asset_class = 'crypto'`)
- Physical gold weight queries: always filter `asset_class = 'precious_metals'` — never rely on `weight_per_unit IS NOT NULL` as the sole discriminator
- Combined gold oz view: two separate sub-totals joined: `physical (precious_metals, sub_class='gold')` + `tokenized (crypto, sub_class='gold')`, not a single WHERE clause

**Phase:** Valuation logic + analytics gold view phase.

---

## Minor Pitfalls

Issues that are **cosmetic, mildly misleading, or DX friction**.

---

### m1: Quantity display shows trailing zeros for crypto in LedgerPage

**What goes wrong:**
After widening to `DECIMAL(20,12)`, the pg driver returns `"14.750000000000"` for a quantity. LedgerPage renders quantities as raw strings — this renders as `14.750000000000`, which looks broken next to gold's `2.000000`.

**Prevention:**
- Add a `formatQuantity(qty: string, assetClass: AssetClass): string` display helper
- For `asset_class = 'crypto'`: `parseFloat(qty).toLocaleString('nl-NL', { maximumFractionDigits: 8 })` (strips trailing zeros, up to 8 significant decimals)
- For metals: existing display (2–4 decimal places) unchanged

**Phase:** Ledger display polish phase.

---

### m2: TypeScript `Asset` interface not updated after DB migration — fields silently `undefined`

**What goes wrong:**
Adding `coin_symbol`, `coin_name`, `custody_type` to the `assets` table via migration does NOT update `frontend/src/types.ts`. Any component destructuring an `Asset` gets `undefined` for these fields — no TypeScript error, no runtime exception, just a blank field and a silent broken lookup.

**Prevention:**
- After each v1.3 DB migration that adds columns to `assets`, immediately update `Asset` in `types.ts`:
  ```typescript
  coin_symbol: string | null;
  coin_name: string | null;
  custody_type: CustodyType | null;
  ```
- Add `CustodyType` to the enums section near `AssetClass`
- Update `CreateAsset` and `UpdateAsset` derived types — they are `Omit<Asset, ...>` and `Partial<CreateAsset>` respectively, so they pick up the new fields automatically. Verify.

**Phase:** Types update — synchronised with DB migrations (same commit if possible).

---

### m3: PAXG/XAUT in Tier 3 but "gold" in combined gold metric — unlabeled distinction confuses the view

**What goes wrong:**
PAXG/XAUT are Tier 3 assets (crypto). A "combined gold oz" view sums `sub_class = 'gold'` across all asset classes — correctly including them. But if the UI labels this as "Total Tier 2 gold oz," the user expects only vault bullion. Tier 2 ("The Vaults") and total gold exposure are different concepts.

**Prevention:**
- Label combined gold exposure as "Total gold exposure (all tiers)" — never "Vault Gold oz"
- Show a breakdown in the analytics view: `Physical gold (Tier 2): X oz` and `Tokenized gold (PAXG/XAUT, Tier 3): Y oz`
- Tier 2 allocation uses Tier 2 `current_value` sum (as now), regardless of gold sub-class

**Phase:** Analytics gold exposure display phase.

---

### m4: EUR values for `qty × spot` produce more than 2 decimal places — formatting inconsistency

**What goes wrong:**
`0.00123 XMR × €127.40` = `€0.15670...`. Displaying this as `€0.16` vs. `€0.157` vs. `€0.15670` is inconsistent with the rest of the dashboard (all EUR values use 2 decimal places via `Intl.NumberFormat('nl-NL', ...)`).

**Prevention:**
- All EUR value renders use `maximumFractionDigits: 2` — this is already the codebase convention for monetary display
- Quantity renders for crypto use up to 8 significant figures
- Coin quantities and EUR values should never share the same formatter

**Phase:** Display/formatting phase — no schema change required.

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | First Action |
|-------|---------------|-------------|
| DB migrations | M3: number collision with v1.2 | `ls api/migrations/ \| tail -5` before creating any file |
| `acquisitions.quantity` widen | C1: silent truncation | Raw SQL `ALTER COLUMN TYPE NUMERIC(20,12)`; test with 12-decimal value |
| `crypto_spot_prices` table | M2: wrong column name; C5: Cartesian join | Name column `price_per_unit`; use `DISTINCT ON` CTE from day one |
| PAXG/XAUT valuation | C3: wrong table; C4: unit mismatch | Explicit `sub_class='gold'` branch; hardcode 31.1035; null weight fields |
| Dashboard aggregation | C2: stale current_value; C5: Cartesian | Define effective_value branch CTE; regression test: add 3 price rows, verify total doesn't change |
| Tier allocation | M4: tier % uses stale values | Tier aggregation uses same CTE as total — not a second `SUM(current_value)` |
| AssetModal UI | M5: state leak; M6: stale manual value | Reset crypto fields on class switch; hide current_value when coin_symbol set |
| Types / interfaces | m2: undefined fields | Update `Asset` interface in same commit as migration |
| Ledger display | m1: trailing zeros | `formatQuantity()` helper before ledger render changes |
| Combined gold analytics | M7: weight query contamination; m3: Tier confusion | Filter physical gold as `asset_class='precious_metals'`; label tokenized separately |

---

## Integration Checklist — v1.3

Before closing each v1.3 phase:

- [ ] Migration numbers do not conflict with v1.2's highest migration
- [ ] `acquisitions.quantity` altered via raw SQL (not Knex fluent API) — value verified round-trip at 12 decimal places
- [ ] `crypto_spot_prices` column named `price_per_unit` (not `price_per_gram`)
- [ ] All spot price joins use `DISTINCT ON` CTE — regression test at 3+ price rows per symbol
- [ ] PAXG/XAUT valuation uses `spot_prices WHERE metal='XAU'` — NOT `crypto_spot_prices`
- [ ] PAXG/XAUT have `weight_per_unit = NULL` in DB
- [ ] `Asset` TypeScript interface updated synchronously with each DB migration
- [ ] `coin_symbol` required by API when `asset_class = 'crypto'`
- [ ] AssetModal resets `coin_symbol`, `coin_name`, `custody_type` on `asset_class` change
- [ ] Dashboard tier aggregation uses same effective_value computation as total — not raw `current_value`
- [ ] Entity filter wired to all v1.3 new API endpoints from day one
- [ ] All EUR quantity display: `maximumFractionDigits: 2`; crypto qty display: up to 8 sig figs

---

*Pitfalls research for: Precious Dashboard v1.3 — Crypto Asset Tracking*
*Researched: 2026-04-13*
*Extends: v1.2 pitfalls (above)*

