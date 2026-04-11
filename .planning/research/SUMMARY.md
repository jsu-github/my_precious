# Research Summary — v1.1

**Milestone:** Market Intelligence & Sovereign Tier System  
**Synthesized:** April 11, 2026  
**Documents:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md  
**Confidence:** HIGH across all four research areas

---

## Stack Additions

**Verdict: Zero new npm packages required for v1.1.**

All five feature areas are implementable with the existing stack (React 18, Vite 5, Tailwind CSS, Express 4, Knex 3, PostgreSQL 16). Specific implementation approaches that avoid new dependencies:

| Feature | Approach | Why No Library Needed |
|---------|----------|-----------------------|
| Dealer CRUD forms | Existing `Modal.tsx` + `FormFields.tsx` pattern | Same modal architecture as AssetModal/EntityModal |
| Tier assignment dropdown | `<select>` in Edit Asset modal | 4 options — no component needed |
| Tier config form | 4-row inline-editable table of `<input type="number">` | Controlled state, PATCH to `/api/tier-config` |
| Allocation range bar | `<div style={{ width: \`${x}%\` }}>` + Tailwind color utilities | CSS-only; no canvas, no chart lib |
| Freshness indicator | `updated_at` timestamp diff in component | Pure JS date math |

**Migration approach for new columns:**  
Use `knex.raw('ALTER TABLE assets ADD COLUMN IF NOT EXISTS ...')` — NOT `alterTable()`. Migration 009's pattern is not idempotent; `IF NOT EXISTS` guards prevent crash-on-re-run.

---

## Feature Table Stakes

### Dealer Price Management

| Feature | Rationale |
|---------|-----------|
| `dealers` table (id, name, contact_notes, we_buy_gold NUMERIC nullable, updated_at) | Foundation — nothing works without it; `NULL` not `0` for unset price |
| `weight_per_unit_grams NUMERIC(10,4)` on `assets` | **Critical finding:** `acquisitions.quantity` is stored in **pieces** not grams; liquidation cannot be computed without unit weight |
| Freshness indicator on dealer price (`updated_at`) | User cannot trust a stale price; "Updated X days ago" is required context |
| Global "Active Dealer" selector in Ledger filter bar | One dealer active at a time; client-side state only — no DB persistence |
| "Liq. Value (Dealer Name)" column in Ledger | Core deliverable; computed client-side: `qty_pieces × weight_per_unit_grams × dealer.we_buy_gold`; shows `—` when weight is null |
| Gain/loss color on Liq. Value vs Cost Basis | Green if `liq_value > cost_basis`, red if below — immediate signal |
| Liquidation total in Ledger footer | Aggregate "what is my gold worth today" in one number |

**Deferred to v1.2:** Per-metal pricing (silver, platinum), price history log, spread vs spot.

### Sovereign Tier System

| Feature | Rationale |
|---------|-----------|
| `tier INT nullable` column on `assets` | Foundation for all tier features; `NULL` = unassigned (NOT Tier 0) |
| `tier_config` table (tier_id PK 0–3, target_pct, min_pct, max_pct) with 4 seed rows | Without bounds, status is meaningless; seeds: (0,2,0,5), (1,8,4,12), (2,70,60,80), (3,20,10,30) |
| Tier config UI: 4-row inline-editable table, auto-save on blur | User adjusts bounds without code; warn amber if sum ≠ 100%, never block |
| `TierPage`: current % vs target + status badge per tier | Core deliverable; single-column vertical list (hierarchical, order 0→3, not 2×2 grid) |
| Range bar: below-min / in-range / above-max zones with current dot + target tick | More density than a plain bar; pure CSS implementation |
| Status thresholds — GREEN: within [min, max]; AMBER: outside ≤5pp; RED: outside >5pp | Hardcode 5pp in v1.1; configurable in v1.2 |
| Tier assignment select in AssetModal | `— Unassigned —`, `0: Cash at Home`, `1: Digital Bank`, `2: Physical Gold Vault`, `3: Crypto` |
| Dashboard health tile | Click-to-TierPage; "3 of 4 Tiers In Range" headline + four status dots; glass-panel pattern |

**Deferred to v1.2:** Historical tier allocation, per-tier currency exposure, drag-to-rebalance, custom tier labels.

---

## Architecture Blueprint

### New Files

```
api/src/
  routes/
    dealers.ts          ← GET / POST / PATCH /:id / DELETE /:id
    tierConfig.ts       ← GET / PATCH /:tierId (with numeric validation at boundary)
  migrations/
    010_dealer_prices.ts   ← CREATE dealers table
    011_weight_and_tier.ts ← ALTER assets ADD weight_per_unit_grams + tier
                             CREATE tier_config + INSERT 4 seed rows (ON CONFLICT IGNORE)

frontend/src/
  pages/
    TierPage.tsx        ← New page; registered in App.tsx View union + Sidebar
```

### Modified Files (integration points)

| File | Change |
|------|--------|
| `api/src/routes/index.ts` | Mount `dealers` and `tierConfig` routers — **do this immediately** after creating each route file |
| `api/src/routes/ledger.ts` | Add `'a.weight_per_unit_grams'` to explicit SELECT list (L18–36) |
| `api/src/routes/dashboard.ts` | Extend `GET /api/dashboard/summary` to return `tier_summary` object |
| `frontend/src/types.ts` | Add `tier: number | null` + `weight_per_unit_grams: string | null` to `Asset`; add `Dealer` + `TierConfig` types; add `'tier'` to `View` union |
| `frontend/src/api.ts` | Add `api.dealers.*` and `api.tierConfig.*` namespaces **before writing any component** |
| `frontend/src/App.tsx` | Add `'tier'` case to `renderPage()` switch |
| `frontend/src/components/layout/Sidebar.tsx` | Add Tier nav item |
| `frontend/src/pages/AssetModal.tsx` | Add `weight_per_unit_grams` field (precious_metals only) + `tier` select |
| `frontend/src/pages/LedgerPage.tsx` | Add dealer state hook + conditional Liq. Value column + footer sum |
| `frontend/src/pages/DashboardPage.tsx` | Add health tile using `tier_summary` from API |

### Build Order (strict dependency chain)

1. **Migrations** (010, 011) — schema foundation; everything else blocks on this
2. **`types.ts`** — all new types before any component touches them
3. **`api.ts`** — new namespaces before any component is written (never inline `fetch()`)
4. **API routes** (dealers, tierConfig) + mount in `routes/index.ts` + ledger SELECT fix
5. **AssetModal** fields (weight + tier) — enables tagging existing assets
6. **LedgerPage** dealer column — depends on dealers API + weight in SELECT
7. **TierPage** + App.tsx/Sidebar — depends on tier_config API + types
8. **Dashboard tile** — depends on `/api/dashboard/summary` tier_summary extension

---

## Watch Out For

| # | Pitfall | One-Line Prevention |
|---|---------|---------------------|
| **C1** | `tier = 0` (Cash at Home) is falsy — silently treated as "Unassigned" everywhere | Always use `asset.tier != null`, never `if (asset.tier)` or `?? 0` |
| **C4** | Tier % denominator excludes NULL-tier assets — all tiers show ~0% on first use | Denominator = `SUM(current_value)` across **all** assets; tier value = `WHERE tier = N` |
| **C2** | `weight_per_unit_grams` absent from ledger API SELECT → NaN with no error | Add `'a.weight_per_unit_grams'` to the explicit `.select(...)` list in `ledger.ts` |
| **C7** | `renderPage()` returns `undefined` for new `'tier'` View case → blank page, no error | Add `'tier'` to `View` union AND `case 'tier':` to the switch **in the same commit** |
| **C3** | `tier_config` seed INSERT crashes on migration re-run (duplicate PK) | Use `.onConflict('tier_id').ignore()` on the seed INSERT |

---

## Recommended Phase Sequence

Based on the dependency chain above:

### Phase 1 — Data Foundation
**Deliver:** Migrations 010 + 011, `types.ts` additions, `api.ts` namespace stubs  
**Why first:** Every other phase blocks on schema and types. Migrations auto-run on API startup — unblocks all local development immediately.  
**Key work:** `010_dealer_prices.ts` (dealers table), `011_weight_and_tier.ts` (`IF NOT EXISTS` guards + idempotent seed), `Dealer` + `TierConfig` + updated `Asset` types, `api.dealers.*` + `api.tierConfig.*` stubs.

### Phase 2 — Dealer Price Management
**Deliver:** Dealers CRUD panel, weight field in AssetModal, Liq. Value column in Ledger  
**Why second:** Depends only on Phase 1. Self-contained feature — no new page, no nav changes.  
**Key work:** `api/routes/dealers.ts` + mount in `index.ts`, ledger SELECT fix, `AssetModal` weight field (precious_metals only), `LedgerPage` active-dealer selector + Liq. Value column + footer sum.

### Phase 3 — Sovereign Tier System
**Deliver:** Tier assignment in AssetModal, `tier_config` API, `TierPage`, Sidebar nav entry  
**Why third:** Depends on Phase 1; independent of Phase 2. Sequential to avoid concurrent `AssetModal` conflicts.  
**Key work:** `api/routes/tierConfig.ts` (with numeric boundary validation), `TierPage.tsx` (range bar, status badges, expandable asset list, rebalancing hint), `App.tsx` View union + renderPage switch, Sidebar nav item.

### Phase 4 — Dashboard Health Tile
**Deliver:** Tier pulse on the daily-open Dashboard view  
**Why last:** Depends on Phase 3 data. Small scope — ideal final integration phase.  
**Key work:** Extend `dashboard.ts` to compute + return `tier_summary`; add glass-panel health tile to `DashboardPage.tsx` with click-to-TierPage navigation.

---

*Sources: `.planning/research/STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md` — all researched April 11, 2026*
