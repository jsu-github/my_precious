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

