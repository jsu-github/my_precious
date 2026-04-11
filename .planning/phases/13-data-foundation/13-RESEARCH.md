# Phase 13 Research: Data Foundation

**Researched:** 2026-04-11
**Domain:** Knex migrations, PostgreSQL schema, TypeScript types, Express router wiring
**Confidence:** HIGH — all findings verified directly against source files in this repo

---

## Summary

Phase 13 is pure infrastructure: two new migration files, two new route files (stubs), extended
TypeScript types, and new `api.ts` namespaces. No UI work. Every change has an exact match in the
existing codebase patterns.

The three non-obvious risks:
1. The `View` union in `Sidebar.tsx` is the source of truth — **not** `types.ts`. Adding `'tier'`
   there without a matching `case 'tier':` in `App.tsx` `renderPage()` causes a TypeScript
   exhaustiveness error.
2. `ledger.ts` uses an explicit SELECT column list — `weight_per_unit_grams` **will not** appear in
   query results unless added there explicitly.
3. `tier = 0` (Grid-Down tier) is falsy — every null check in API and frontend logic **must** use
   `!= null`, never a truthiness check.

**Primary recommendation:** Follow the exact patterns in files 007–009 for migrations; follow the
existing `api.ts` namespace shape for new namespaces.

---

## Project Constraints (from copilot-instructions.md)

- **Money precision:** `NUMERIC(20, 2)` / `table.decimal(col, 20, 2)` — NEVER `float` or `double`
- **Migrations:** Sequential numbered files in `api/migrations/`. Auto-run at startup. Always use
  `createTableIfNotExists` / `dropTableIfExists`.
- **API routes:** All endpoints prefixed `/api/`. New routers mounted in `routes/index.ts`.
- **API calls:** Always add to `api.ts`. Never call `fetch` inline in components.
- **Types:** All shared types in `frontend/src/types.ts`.
- **Navigation:** No React Router. `View` is a discriminated union in `Sidebar.tsx`, re-exported
  through `AppShell.tsx`; `App.tsx` imports it from `./layouts/AppShell`.
- **Error shape:** `{ error: { message: string, status: number } }`

---

## Migration Patterns (exact)

All migration files follow an identical structure. Source of truth: files 004–009.

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('table_name', (table) => {
    table.increments('id').primary();
    // columns ...
    table.timestamps(true, true);  // adds created_at + updated_at with defaults
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('table_name');
}
```

**ALTER TABLE pattern** (from 009_asset_subclass.ts):
```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('assets', (table) => {
    table.string('sub_class', 50).nullable();
    table.string('product_type', 50).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('sub_class');
    table.dropColumn('product_type');
  });
}
```

**Column type reference (verified from existing migrations):**

| Knex call | PostgreSQL type | Used for |
|-----------|----------------|---------|
| `table.increments('id').primary()` | SERIAL PRIMARY KEY | all entity PKs |
| `table.integer('col').primary()` | INTEGER PRIMARY KEY | fixed PKs (tier_config) |
| `table.decimal('col', 20, 2)` | NUMERIC(20,2) | monetary values |
| `table.decimal('col', 10, 4)` | NUMERIC(10,4) | weights, gram prices |
| `table.string('col', N)` | VARCHAR(N) | short strings |
| `table.text('col')` | TEXT | long strings |
| `table.integer('col')` | INTEGER | FK refs, tier |
| `table.timestamp('col')` | TIMESTAMP | single timestamp |
| `table.timestamps(true, true)` | created_at + updated_at | both auto default |
| `.notNullable()` | NOT NULL | — |
| `.nullable()` | NULL | — |
| `.defaultTo(knex.fn.now())` | DEFAULT NOW() | timestamp defaults |

---

## New Migration 010: dealers table

**File:** `api/migrations/010_dealers.ts`

```typescript
import type { Knex } from 'knex';

// Dealer reference data for gold buy-price tracking (v1.1)
// we_buy_gold_per_gram uses NUMERIC(10,4) — 4dp for gram prices

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('dealers', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.text('contact_notes').nullable();
    table.decimal('we_buy_gold_per_gram', 10, 4).nullable();
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dealers');
}
```

**Design note:** The ROADMAP spec lists `updated_at` only (no `created_at`). This is intentional —
dealers are reference data where last-updated is meaningful but creation date is not. The pattern
mirrors `valuation_snapshots` which also omits one timestamp direction. If the planner wants
`created_at` too, `table.timestamps(true, true)` is the one-liner alternative. The spec must win
— use `updated_at` only.

The PUT handler in `routes/dealers.ts` must explicitly set `updated_at: knex.fn.now()` (same as
`routes/assets.ts` line 66: `.update({ ...req.body, updated_at: knex.fn.now() })`).

---

## New Migration 011: assets columns + tier_config table

**File:** `api/migrations/011_tier_system.ts`

`alterTable` must use `IF NOT EXISTS` semantics — in Knex, adding a nullable column to an existing
table is idempotent only if the migration has not run. Standard `table.decimal(...).nullable()` will
throw if the column already exists on re-run. Since migrations are tracked in `knex_migrations` and
only run once, this is not an issue in practice — but comment it clearly.

```typescript
import type { Knex } from 'knex';

// Adds weight + tier tracking to assets, and creates the 4-tier config table
// tier: 0 = Grid-Down, 1 = Digital Liquidity, 2 = The Vaults, 3 = Uncensorable Frontier
// CRITICAL: tier = 0 is falsy in JS — all null checks MUST use != null, never truthiness

export async function up(knex: Knex): Promise<void> {
  // 1. Add new columns to assets
  await knex.schema.alterTable('assets', (table) => {
    table.decimal('weight_per_unit_grams', 10, 4).nullable();
    table.integer('tier').nullable();
  });

  // 2. Create tier_config table — tier_id is a fixed integer PK (0–3), NOT auto-increment
  await knex.schema.createTableIfNotExists('tier_config', (table) => {
    table.integer('tier_id').primary();
    table.decimal('target_pct', 5, 2).notNullable();
    table.decimal('min_pct', 5, 2).notNullable();
    table.decimal('max_pct', 5, 2).notNullable();
  });

  // 3. Seed the 4 tier rows — ON CONFLICT DO NOTHING for idempotency
  await knex('tier_config')
    .insert([
      { tier_id: 0, target_pct: 2,  min_pct: 0,  max_pct: 5  },
      { tier_id: 1, target_pct: 8,  min_pct: 4,  max_pct: 12 },
      { tier_id: 2, target_pct: 70, min_pct: 60, max_pct: 80 },
      { tier_id: 3, target_pct: 20, min_pct: 10, max_pct: 30 },
    ])
    .onConflict('tier_id')
    .ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tier_config');
  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('weight_per_unit_grams');
    table.dropColumn('tier');
  });
}
```

**Knex `.onConflict().ignore()` generates:** `INSERT ... ON CONFLICT (tier_id) DO NOTHING`

**Percentage column precision:** `NUMERIC(5, 2)` supports values up to 999.99%. This covers all
realistic allocation percentages (0.00 – 100.00) with room for config errors.

---

## ledger.ts SELECT list

**File:** `api/src/routes/ledger.ts`

**Current SELECT block (lines 19–36):**
```typescript
      .select(
        'acq.id',
        'acq.asset_id',
        'acq.purchase_date',
        'acq.cost_basis',
        'acq.quantity',
        'acq.tax_status',
        'acq.description',
        'acq.created_at',
        'acq.updated_at',
        'a.name as asset_name',
        'a.asset_class',
        'a.sub_class',
        'a.product_type',
        'a.current_value as asset_current_value',   // ← add weight_per_unit_grams BEFORE this line
        'e.name as entity_name',
        'e.type as entity_type',
      )
```

**After change — add `'a.weight_per_unit_grams'` after `'a.product_type'`:**
```typescript
        'a.product_type',
        'a.weight_per_unit_grams',                  // ← NEW LINE
        'a.current_value as asset_current_value',
```

**Why this line matters:** `assets.*` is NOT used in this query (it uses `a.id` via join but
selects explicit columns). If `weight_per_unit_grams` is not added here, it will be `undefined` in
every `LedgerRow` even after the migration — silent failure, no error thrown.

---

## routes/index.ts mounting

**File:** `api/src/routes/index.ts`

**Current content (all 16 lines):**
```typescript
import { Router } from 'express';
import entitiesRouter from './entities';
import assetLocationsRouter from './assetLocations';
import assetsRouter from './assets';
import transfersRouter from './transfers';
import dashboardRouter from './dashboard';
import ledgerRouter from './ledger';

const router = Router();

router.use('/entities', entitiesRouter);
router.use('/asset-locations', assetLocationsRouter);
router.use('/assets', assetsRouter);
router.use('/transfers', transfersRouter);
router.use('/dashboard', dashboardRouter);
router.use('/ledger', ledgerRouter);

export default router;
```

**After Phase 13 changes — add at bottom of imports + mounts:**
```typescript
import dealersRouter from './dealers';
import tierConfigRouter from './tierConfig';
// ...
router.use('/dealers', dealersRouter);
router.use('/tier-config', tierConfigRouter);
```

**Route path convention:** `/tier-config` (kebab-case) consistent with `/asset-locations`. The file
name `tierConfig.ts` uses camelCase (consistent with existing `assetLocations.ts`).

---

## New route files (stubs)

These files are created in Phase 13 so endpoints are callable. Full business logic is wired in
Phase 14.

**`api/src/routes/dealers.ts`** — full CRUD:
```typescript
import { Router } from 'express';
import { knex } from '../db';

const router = Router();

// GET /api/dealers
router.get('/', async (req, res, next) => {
  try {
    res.json(await knex('dealers').orderBy('name'));
  } catch (err) { next(err); }
});

// GET /api/dealers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const row = await knex('dealers').where({ id: req.params.id }).first();
    if (!row) { const e: any = new Error('Dealer not found'); e.status = 404; throw e; }
    res.json(row);
  } catch (err) { next(err); }
});

// POST /api/dealers
router.post('/', async (req, res, next) => {
  try {
    const [row] = await knex('dealers').insert(req.body).returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

// PUT /api/dealers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const [row] = await knex('dealers')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: knex.fn.now() })
      .returning('*');
    if (!row) { const e: any = new Error('Dealer not found'); e.status = 404; throw e; }
    res.json(row);
  } catch (err) { next(err); }
});

// DELETE /api/dealers/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await knex('dealers').where({ id: req.params.id }).delete();
    if (!deleted) { const e: any = new Error('Dealer not found'); e.status = 404; throw e; }
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
```

**`api/src/routes/tierConfig.ts`** — list + update only (no create/delete — rows are fixed):
```typescript
import { Router } from 'express';
import { knex } from '../db';

const router = Router();

// GET /api/tier-config
router.get('/', async (req, res, next) => {
  try {
    res.json(await knex('tier_config').orderBy('tier_id'));
  } catch (err) { next(err); }
});

// PUT /api/tier-config/:tierId
router.put('/:tierId', async (req, res, next) => {
  try {
    const [row] = await knex('tier_config')
      .where({ tier_id: req.params.tierId })
      .update(req.body)
      .returning('*');
    if (!row) { const e: any = new Error('Tier config not found'); e.status = 404; throw e; }
    res.json(row);
  } catch (err) { next(err); }
});

export default router;
```

---

## types.ts changes

**File:** `frontend/src/types.ts`

### 1. Extend `Asset` interface (after `product_type` line, ~line 55)

**Current Asset (lines ~40–70):**
```typescript
export interface Asset {
  id: number;
  entity_id: number;
  location_id: number | null;
  name: string;
  asset_class: AssetClass;
  sub_class: string | null;
  product_type: string | null;
  current_value: string;
  security_class: SecurityClass;
  audit_frequency: AuditFrequency;
  last_audit_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields ...
}
```

**Add two fields after `product_type`:**
```typescript
  sub_class: string | null;
  product_type: string | null;
  weight_per_unit_grams: string | null; // NUMERIC as string
  tier: number | null;                  // 0–3; NOTE: 0 is falsy — use != null, not truthiness
  current_value: string;
```

### 2. Extend `LedgerRow` interface (~line 160)

Add `weight_per_unit_grams` after `product_type`:
```typescript
  sub_class: string | null;
  product_type: string | null;
  weight_per_unit_grams: string | null; // NUMERIC as string
  asset_current_value: string;
```

### 3. Add new `Dealer` interface (after `ValuationSnapshot`)

```typescript
export interface Dealer {
  id: number;
  name: string;
  contact_notes: string | null;
  we_buy_gold_per_gram: string | null; // NUMERIC as string
  updated_at: string;
}
export type CreateDealer = Pick<Dealer, 'name' | 'contact_notes' | 'we_buy_gold_per_gram'>;
export type UpdateDealer = Partial<CreateDealer>;
```

### 4. Add new `TierConfig` interface

```typescript
export interface TierConfig {
  tier_id: number;     // 0 = Grid-Down, 1 = Digital Liquidity, 2 = The Vaults, 3 = Uncensorable Frontier
  target_pct: number;
  min_pct: number;
  max_pct: number;
}
// No CreateTierConfig — rows are fixed; only update is allowed
export type UpdateTierConfig = Pick<TierConfig, 'target_pct' | 'min_pct' | 'max_pct'>;
```

### 5. Add DashboardSummary types to api.ts imports

The import block in `api.ts` must be updated to include `Dealer`, `CreateDealer`, `UpdateDealer`,
`TierConfig`, `UpdateTierConfig`.

---

## api.ts changes

**File:** `frontend/src/api.ts`

### Import additions (top of file):

```typescript
import type {
  // ... existing imports ...
  Dealer, CreateDealer, UpdateDealer,
  TierConfig, UpdateTierConfig,
} from './types';
```

### New namespaces (added inside the `api` const object, before `} as const`):

The current `api` object ends with:
```typescript
  ledger: {
    list: (filters?) => { ... },
  },
} as const;
```

Add after `ledger`:
```typescript
  dealers: {
    list: () => request<Dealer[]>('/dealers'),
    get: (id: number) => request<Dealer>(`/dealers/${id}`),
    create: (body: CreateDealer) =>
      request<Dealer>('/dealers', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: UpdateDealer) =>
      request<Dealer>(`/dealers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<void>(`/dealers/${id}`, { method: 'DELETE' }),
  },

  tierConfig: {
    list: () => request<TierConfig[]>('/tier-config'),
    update: (tierId: number, body: UpdateTierConfig) =>
      request<TierConfig>(`/tier-config/${tierId}`, { method: 'PUT', body: JSON.stringify(body) }),
  },
```

**Pattern match:** Compare to `transfers` (simple CRUD) and `dashboard` (read-only) — same shape.
`tierConfig` has no `create`/`delete` because the 4 rows are fixed seed data.

---

## App.tsx changes needed

**File:** `frontend/src/App.tsx`

### Critical: renderPage() must handle 'tier' case

The `View` union is defined in `Sidebar.tsx` and TypeScript checks switch exhaustiveness. Adding
`'tier'` to the union without a case causes:
```
Type '() => JSX.Element | undefined' is not assignable to type '() => JSX.Element'
```
(or similar exhaustiveness error depending on TS strict settings).

**Current renderPage() (lines 15–24):**
```typescript
  function renderPage() {
    switch (view) {
      case 'dashboard':  return <DashboardPage entityFilter={entityFilter} />;
      case 'ledger':     return <LedgerPage entityFilter={entityFilter} />;
      case 'analytics':  return <AnalyticsPage entityFilter={entityFilter} />;
      case 'locations':  return <LocationsPage entityFilter={entityFilter} />;
      case 'tax':        return <TaxPage entityFilter={entityFilter} />;
      case 'entity':     return <EntityPage entityFilter={entityFilter} />;
    }
  }
```

**Add stub case in Phase 13 (TierPage component is built in Phase 15):**
```typescript
      case 'tier':       return <div />;  // placeholder — TierPage added in Phase 15
```

**No import needed** for the placeholder div. When Phase 15 adds `TierPage`, this placeholder is
replaced and the import is added.

---

## Sidebar.tsx changes needed

**File:** `frontend/src/components/Sidebar.tsx`

### View type update (line 14)

**Current (line 14):**
```typescript
export type View = 'dashboard' | 'ledger' | 'analytics' | 'locations' | 'tax' | 'entity';
```

**Phase 13 change:**
```typescript
export type View = 'dashboard' | 'ledger' | 'analytics' | 'locations' | 'tax' | 'entity' | 'tier';
```

### NAV_ITEMS: DO NOT TOUCH in Phase 13

The `NAV_ITEMS` array and any icon imports for `'tier'` are Phase 15 work. Adding a nav item here
before TierPage exists will produce a navigation link that renders a blank `<div />` — bad UX.

Phase 13 adds `'tier'` to the type union only. The nav item appears in Phase 15.

**Phased plan:**
| Phase | What changes |
|-------|--------------|
| 13 | `View` union gets `\| 'tier'`; `App.tsx` gets `case 'tier': return <div />;` |
| 15 | `NAV_ITEMS` gets tier entry; `TierPage` component replaces the placeholder |

---

## Validation Architecture

All success criteria for Phase 13 are grep-verifiable or curl-verifiable. No test framework needed
for this infrastructure phase.

### Checklist of verifiable conditions

**Migration 010 — dealers table:**
- [ ] `grep -r "dealers" api/migrations/` → shows `010_dealers.ts`
- [ ] `grep "we_buy_gold_per_gram" api/migrations/010_dealers.ts` → shows `decimal(col, 10, 4)`
- [ ] `curl localhost:3001/api/dealers` → returns `[]` (empty array, 200 OK)
- [ ] `curl -X POST localhost:3001/api/dealers -H 'Content-Type: application/json' -d '{"name":"Test Dealer"}'` → returns `{id:1, name:"Test Dealer", ...}`

**Migration 011 — assets columns + tier_config:**
- [ ] `grep "weight_per_unit_grams" api/migrations/011_tier_system.ts` → present
- [ ] `grep "tier_config" api/migrations/011_tier_system.ts` → present
- [ ] `curl localhost:3001/api/tier-config` → returns 4 rows with `tier_id` 0–3
- [ ] `curl localhost:3001/api/assets` → response objects include `weight_per_unit_grams` and `tier` keys (values null for existing assets)

**ledger.ts SELECT:**
- [ ] `grep "weight_per_unit_grams" api/src/routes/ledger.ts` → present
- [ ] `curl localhost:3001/api/ledger` → response objects include `weight_per_unit_grams` key

**routes/index.ts:**
- [ ] `grep "dealersRouter\|tierConfigRouter" api/src/routes/index.ts` → both present
- [ ] `grep "'/dealers'\|'/tier-config'" api/src/routes/index.ts` → both mount paths present

**types.ts:**
- [ ] `grep "Dealer\|TierConfig" frontend/src/types.ts` → both interfaces present
- [ ] `grep "weight_per_unit_grams\|tier:" frontend/src/types.ts` → present in Asset AND LedgerRow

**api.ts:**
- [ ] `grep "dealers:\|tierConfig:" frontend/src/api.ts` → both namespaces present
- [ ] `grep "Dealer\|TierConfig" frontend/src/api.ts` → imported from types

**Sidebar.tsx / App.tsx:**
- [ ] `grep "tier" frontend/src/components/Sidebar.tsx` → View union includes `'tier'`
- [ ] `grep "case 'tier'" frontend/src/App.tsx` → case exists in renderPage()
- [ ] `grep "Layers\|LayersIcon\|tier.*NAV_ITEMS\|NAV_ITEMS.*tier" frontend/src/components/Sidebar.tsx` → should NOT exist (Phase 15)

**TypeScript compile check:**
- [ ] `cd frontend && npx tsc --noEmit` → exits 0 (no errors)
- [ ] `cd api && npx tsc --noEmit` → exits 0 (no errors)

---

## Common Pitfalls

### Pitfall 1: tier = 0 falsy check
**What goes wrong:** `if (asset.tier)` is `false` when tier is 0 (Grid-Down). The Grid-Down tier
assets appear unassigned.
**How to avoid:** Always write `asset.tier != null` (or `asset.tier !== null && asset.tier !== undefined`).
**Applies to:** API business logic in Phase 14+, frontend display in Phase 15+. Phase 13 introduces
the field — the pitfall becomes active in Phase 14.

### Pitfall 2: ledger.ts explicit column list
**What goes wrong:** `weight_per_unit_grams` appears in `assets` after migration but ledger queries
use explicit SELECT, not `a.*`. The field is silently absent from all LedgerRow responses + the type
says it exists = runtime undefined where string expected.
**How to avoid:** Add `'a.weight_per_unit_grams'` to the `.select()` block in this phase.

### Pitfall 3: View union exhaustiveness
**What goes wrong:** Adding `'tier'` to the View union in Sidebar.tsx without a `case 'tier':` in
`App.tsx` `renderPage()` causes TypeScript to flag the function as potentially returning `undefined`.
**How to avoid:** Add the case in the same commit as the type change. Use `return <div />;` as
placeholder until Phase 15.

### Pitfall 4: tier_config seeding not idempotent
**What goes wrong:** Running migration up twice (e.g., on a dev reset that doesn't fully clean) will
throw a unique constraint violation on `tier_id`.
**How to avoid:** Use `.onConflict('tier_id').ignore()` — generates `ON CONFLICT DO NOTHING`.
This is already specified in migration 011 above.

### Pitfall 5: dealers table updated_at manual set
**What goes wrong:** PUT to `/api/dealers/:id` using just `...req.body` without explicitly setting
`updated_at`. The column stays at the original default and never updates.
**How to avoid:** `knex('dealers').update({ ...req.body, updated_at: knex.fn.now() })` — same
pattern as `routes/assets.ts` line 66.

### Pitfall 6: TierConfig type — tier_id is not auto-generated
**What goes wrong:** If `CreateTierConfig` is defined with `tier_id` required and someone calls
`api.tierConfig.create()`, they'd expect to POST a new tier — but the table has a fixed PK and
`ON CONFLICT DO NOTHING` means duplicate inserts silently succeed without creating new rows.
**How to avoid:** Do NOT define a `create` method on `api.tierConfig`. The existing 4 rows from
migration seeding are the only rows. Phase 13 must not expose a create endpoint.

---

## Sources

All findings are PRIMARY confidence — verified directly from source files in this repository.

| File | What was verified |
|------|------------------|
| `api/migrations/004_assets.ts` | `createTableIfNotExists`, `increments`, `decimal(20,2)`, `timestamps(true,true)` |
| `api/migrations/007_transfers.ts` | FK refs, `onDelete`, `timestamps` pattern |
| `api/migrations/008_valuation_snapshots.ts` | Single-timestamp pattern (`created_at` only, no `updated_at`) |
| `api/migrations/009_asset_subclass.ts` | `alterTable` add/drop column pattern |
| `api/src/routes/index.ts` | All 16 lines — import + mount pattern |
| `api/src/routes/ledger.ts` | Full SELECT column list (lines 19–36) |
| `api/src/routes/assets.ts` | PUT pattern with `updated_at: knex.fn.now()` |
| `frontend/src/types.ts` | Full Asset, LedgerRow, input type patterns |
| `frontend/src/api.ts` | Full `api` object shape; `as const`; all existing namespaces |
| `frontend/src/App.tsx` | Full `renderPage()` switch; View import from AppShell |
| `frontend/src/components/Sidebar.tsx` | View type definition (source of truth); NAV_ITEMS shape |
| `frontend/src/layouts/AppShell.tsx` | `export type { View, EntityFilter }` re-export |
