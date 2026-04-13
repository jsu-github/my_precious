# Stack Research

**Domain:** Personal finance dashboard — sovereign wealth management (single-user, local, React + Express + PostgreSQL)
**Researched:** April 9, 2026
**Confidence:** HIGH (stack already fully specified; this confirms choices and adds implementation guidance)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 18.x | UI framework | Concurrent rendering, hooks-first; confirmed by .stitch mockup patterns (functional components only) |
| TypeScript | 5.x | Type safety everywhere | End-to-end types across frontend + API; critical for financial data correctness |
| Vite | 5.x | Build tool + dev server | HMR in <200ms; native ESM; Tailwind CSS integration via `vite-plugin-tailwindcss` |
| Express | 4.x | REST API | Minimal, well-understood; suits single-user local tools — no framework overhead |
| Knex.js | 3.x | SQL query builder + migrations | Auto-run migrations at startup; `createTableIfNotExists` pattern; PostgreSQL dialect |
| PostgreSQL | 16 | Database | Mature, ACID-compliant; handles financial data integrity (no rounding errors with `NUMERIC`) |
| Docker Compose | v2 | Local runtime orchestration | Single `make dev` starts everything; volumes for DB persistence under `data/db/` |

### Frontend Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 3.x | Utility-first styling | All styling — with Midnight Sovereign token extension in `tailwind.config.ts` |
| Material Symbols Outlined | Latest (Google Fonts) | Icon font | All icons; variable font with FILL/wght axes — use `font-variation-settings: 'FILL' 0, 'wght' 300` |
| Newsreader | Latest (Google Fonts) | Serif display font | All `font-headline` elements: page titles, portfolio totals, nav wordmark |
| Inter | Latest (Google Fonts) | Sans-serif data font | All body text, tables, labels; enable `font-variant-numeric: tabular-nums` on financial figures |
| xlsx (SheetJS) | 0.20.x | Excel import parsing | Bulk import of .xlsx/.xls files — `XLSX.read()` → JSON → API; runs in browser or Node |

### Tailwind Configuration (Critical — Extract from Screens)

The `.stitch/design-system/midnight-sovereign.json` token set must be loaded into `tailwind.config.ts`:

```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'background': '#0b1326',
        'surface': '#0b1326',
        'surface-dim': '#0b1326',
        'surface-bright': '#31394d',
        'surface-container-lowest': '#060e20',
        'surface-container-low': '#131b2e',
        'surface-container': '#171f33',
        'surface-container-high': '#222a3d',
        'surface-container-highest': '#2d3449',
        'surface-variant': '#2d3449',
        'on-surface': '#dae2fd',
        'on-surface-variant': '#c6c6cd',
        'primary': '#e9c349',
        'on-primary': '#3c2f00',
        'on-primary-container': '#9d7d00',
        'secondary': '#4edea3',
        'on-secondary': '#003824',
        'tertiary': '#b9c7e0',
        'on-tertiary-container': '#738298',
        'tertiary-fixed-dim': '#b9c7e0',
        'error': '#ffb4ab',
        'outline': '#909097',
        'outline-variant': '#45464d',
        // ... full token set from midnight-sovereign.json
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem',
      },
      fontFamily: {
        headline: ['Newsreader', 'serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
    },
  },
}
```

### CSS Utilities Required (from screens)

These classes appear across all 6 screens and need to be available globally:

```css
/* globals.css */
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
}

.glass-panel {
  background: rgba(34, 42, 61, 0.7);
  backdrop-filter: blur(24px);
}

.gold-gradient {
  background: linear-gradient(135deg, #e9c349 0%, #9d7d00 100%);
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

### Backend Supporting Libraries

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| multer | 1.x | File upload middleware | Excel import endpoint: `POST /api/import` receives `.xlsx` file |
| xlsx (SheetJS) | 0.20.x | Excel parsing (server-side) | Parse uploaded file → structured JSON → validated → inserted |
| cors | 2.x | CORS headers | Frontend :3000 → API :3001 in dev |
| winston | 3.x | Structured logging | Optional but recommended for audit trail logging |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ts-node-dev | TypeScript watch + restart | API hot reload in Docker dev container |
| Vite HMR | React hot reload | Frontend dev container |
| Make | Dev commands | `make dev`, `make up`, `make down`, `make clean` |
| Docker Compose v2 | Container orchestration | `docker compose` (not `docker-compose`) |

## Installation

```bash
# Frontend
npm install react react-dom typescript vite @vitejs/plugin-react
npm install tailwindcss @tailwindcss/forms @tailwindcss/container-queries
npm install xlsx

# API
npm install express knex pg cors multer xlsx typescript
npm install -D ts-node-dev @types/express @types/node @types/cors @types/multer
```

## API Port — Decision Required

| Option | Source | Notes |
|--------|--------|-------|
| `:3001` | copilot-instructions.md | Used in `make dev` instructions |
| `:3040` | PRD.md | Used in technical architecture table |

**Recommendation: Use `:3001`** — copilot-instructions is the active development spec.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Knex.js | Prisma | Better for Prisma when you want type-safe client generation; Knex preferred here because migrations-first workflow is already established |
| Tailwind CSS | CSS Modules | CSS Modules when you need more isolation; Tailwind is already used in all 6 screen mockups |
| xlsx (SheetJS) | Papa Parse | Papa Parse for CSV-only; SheetJS needed because user's existing data is in Excel |
| Express | Fastify | Fastify for high-throughput APIs; Express is fine for single-user local tool |
| Material Symbols | Heroicons/Radix Icons | Use alternatives if you want tree-shakable SVG icons; Material Symbols is already in all 6 screens |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `FLOAT` / `DOUBLE` for money | Floating-point rounding errors on currency values | PostgreSQL `NUMERIC(20, 2)` for all monetary columns |
| React Router | Architectural constraint — discriminated union navigation is required | Custom `View` state in `App.tsx` |
| Pure black `#000000` | Kills Midnight Sovereign depth | `#0b1326` (surface dim) minimum |
| 1px solid borders for structure | Breaks "The Sovereign Vault" aesthetic | Surface nesting: `surface-container-low` → `surface-container-high` |
| Any UI component library (MUI, Shadcn) | Not specified; all screens use custom HTML | Tailwind utilities with global CSS utilities above |
| `fetch()` inline in components | Architecture rule — all API calls centralized | `api.*` methods from `frontend/src/api.ts` |

## Sources

- `.stitch/screens/*.html` — actual implementation patterns extracted from all 6 screens
- `.stitch/design-system/midnight-sovereign.json` — token source of truth
- `.github/copilot-instructions.md` — architectural constraints
- `PRD.md` — stack specification

---
*Stack research for: Precious Dashboard — Unified Wealth Command Center*
*Researched: April 9, 2026*

---

# Stack Research — v1.1 Additions

**Date:** April 11, 2026  
**Milestone:** v1.1 — Market Intelligence & Sovereign Tier System  
**Confidence:** HIGH — existing stack is mature; all new features are data-CRUD + CSS visualization, not novel tech.

## New Dependencies Needed

| Package | Version | Purpose | Justification |
|---------|---------|---------|---------------|
| _(none)_ | — | — | All five feature areas are implementable with the existing stack — see rationale below |

**Verdict: Zero new npm packages required for v1.1.**

| Feature | Implementation approach | Why no new library |
|---------|------------------------|-------------------|
| Dealer CRUD forms | Existing `Modal.tsx` + `FormFields.tsx` pattern | Same modal architecture already used for AssetModal/EntityModal |
| Tier assignment dropdown | `<select>` in Edit Asset modal | 4 options — no component needed |
| Tier config form | 4-row table of `<input type="number">` | Controlled state, POST/PUT to `/api/tier-config` |
| Allocation progress bars | `<div style={{ width: \`${pct}%\` }}>` + Tailwind color class | CSS progress bars cover 100% of the spec requirement |
| Status indicators (green/amber/red) | Tailwind `bg-emerald-500 / bg-amber-500 / bg-red-500` computed from `getTierStatus()` | Pure utility function, no state library |
| Dashboard Tier health tile | 4 compact rows, dot + label + value | No chart needed; table-style summary satisfies TIER-05 |

### If a donut/arc chart is wanted for the dashboard tile (optional, beyond spec)

Inline SVG is the zero-dependency path — no library required:

```tsx
// Minimal arc renderer — ~25 lines, zero deps
function describeArc(cx: number, cy: number, r: number, start: number, end: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(start - 90));
  const y1 = cy + r * Math.sin(toRad(start - 90));
  const x2 = cx + r * Math.cos(toRad(end - 90));
  const y2 = cy + r * Math.sin(toRad(end - 90));
  const large = end - start > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}
```

Render 4 colored `<path>` segments in a `<svg>` — integrates directly with Midnight Sovereign tokens. This is the preferred approach and avoids any bundle impact.

---

## What NOT to Add

- **recharts / chart.js / visx / @nivo/\***: The described features require progress bars and status dots — not charts. Adding a charting library for 4 progress bars is overengineering. If the AnalyticsPage is expanded in v1.2 to show allocation trends over time, recharts 2.x would be the right addition then.
- **react-query / SWR / TanStack Query**: No polling, no cache invalidation, no optimistic updates required. The `api.ts` fetch-on-mount pattern is correct at this scale.
- **Zod / yup / valibot**: Form validation for 3-4 fields (dealer name, tier %, price per gram) does not justify a schema library. Inline guards at the Express layer + simple `if (!name.trim())` in components is the right fit.
- **date-fns / dayjs**: Dealer prices are "current only" — no `effective_date`, no date arithmetic, no formatting beyond what `toLocaleDateString('nl-NL')` already handles.
- **uuid**: All existing tables use `increments()` serial PKs. New tables follow the same convention.
- **multer (new)**:  Already in stack (v1.0); not needed for new routes (no file upload in v1.1).
- **shadcn/ui, Radix UI, Headless UI**: Breaks the architectural constraint. The existing `Modal.tsx` + `FormFields.tsx` + custom CSS covers all needed CRUD interfaces.

---

## Migration Patterns

### Conventions derived from migrations 001–009

```ts
// ✓ createTableIfNotExists / dropTableIfExists — always
// ✓ Monetary/price columns: table.decimal(col, precision, scale) — NEVER float
// ✓ Percentage columns: decimal(5, 2) — supports 0.00–999.99
// ✓ FK with cascade: .references('id').inTable('parent').onDelete('CASCADE')
// ✓ Optional FK:     .nullable() before .references()
// ✓ All tables:      table.timestamps(true, true)
// ✓ ALTER pattern:   knex.schema.alterTable() + dropColumn in down() — see migration 009
```

### Migration 010 — `dealers` table

```ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('dealers', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.text('contact_notes').nullable();
    // "current only" requirement — one bid price per dealer for gold, updated in-place
    // NUMERIC(12,4): supports e.g. €59.4500/gram — 4 decimal places for gram pricing
    table.decimal('we_buy_price_per_gram', 12, 4).nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dealers');
}
```

**Design rationale:** `we_buy_price_per_gram` lives directly on `dealers` because the requirement is "current only" — no price history, single commodity (gold), single active price per dealer. A separate `dealer_prices` junction table would be premature normalization for v1.1. If silver/platinum prices are added in v1.2, a follow-up migration can add columns or extract to a junction table.

### Migration 011 — `tier_config` table with seeded defaults

```ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('tier_config', (table) => {
    table.increments('id').primary();
    table.integer('tier').notNullable().unique(); // 0, 1, 2, 3
    table.string('label', 100).notNullable();
    table.decimal('target_pct', 5, 2).notNullable().defaultTo(0);
    table.decimal('min_pct', 5, 2).notNullable().defaultTo(0);
    table.decimal('max_pct', 5, 2).notNullable().defaultTo(100);
    table.timestamps(true, true);
  });

  // Seed defaults inside migration — these are config, not test data
  // Guard makes the insert idempotent across re-runs
  const row = await knex('tier_config').count('id as cnt').first();
  if (Number(row?.cnt) === 0) {
    await knex('tier_config').insert([
      { tier: 0, label: 'Tier 0 — Core Monetary',  target_pct: 20, min_pct: 10, max_pct: 40 },
      { tier: 1, label: 'Tier 1 — Hard Assets',     target_pct: 40, min_pct: 25, max_pct: 60 },
      { tier: 2, label: 'Tier 2 — Real Assets',     target_pct: 30, min_pct: 15, max_pct: 50 },
      { tier: 3, label: 'Tier 3 — Speculative',     target_pct: 10, min_pct: 0,  max_pct: 20 },
    ]);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tier_config');
}
```

**Design rationale:** Seeding inside the migration is correct here because these 4 rows are required configuration — the Tier page cannot render without them. The `count` guard prevents double-insertion if migrations re-run (Knex tracks ran migrations in `knex_migrations`, but the guard is cheap insurance).

### Migration 012 — add `tier` + `preferred_dealer_id` to `assets`

```ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('assets', (table) => {
    // nullable — existing assets have no tier until user assigns one
    table.integer('tier').nullable();
    // optional dealer link for acquisition-price context
    table.integer('preferred_dealer_id')
      .nullable()
      .references('id')
      .inTable('dealers')
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('preferred_dealer_id');
    table.dropColumn('tier');
  });
}
```

**Note on `checkIn`:** Knex 3.x supports `table.integer('tier').checkBetween([0, 3])` for a DB-level constraint. For a single-user local tool, API-layer validation is equally sufficient and avoids migration complexity. Either approach is valid.

---

## Integration Notes

### New route files (follow existing pattern)

```ts
// api/src/routes/index.ts — add two mounts
import dealersRouter   from './dealers';
import tierConfigRouter from './tierConfig';

router.use('/dealers',    dealersRouter);
router.use('/tier-config', tierConfigRouter);
// Tier assignment: PATCH /api/assets/:id already exists — just add `tier` field
//                  to the existing update handler's allowed body fields
```

No changes to `index.ts` or Express app setup.

### API response types — NUMERIC → string convention

Follow the existing pattern from `types.ts` (all NUMERIC pg columns are strings in API responses):

```ts
// types.ts additions
export interface Dealer {
  id: number;
  name: string;
  contact_notes: string | null;
  we_buy_price_per_gram: string | null; // NUMERIC as string — parseFloat() at use site
  created_at: string;
  updated_at: string;
}

export interface TierConfig {
  id: number;
  tier: number;            // 0–3
  label: string;
  target_pct: string;      // NUMERIC as string — parseFloat() for arithmetic
  min_pct: string;
  max_pct: string;
  created_at: string;
  updated_at: string;
}

// Asset type gains two new optional fields (present after migration 012)
// Add to existing Asset interface:
//   tier: number | null;
//   preferred_dealer_id: number | null;
```

### Tier status utility (zero deps)

```ts
// frontend/src/utils/tierStatus.ts
export type TierStatus = 'on-target' | 'warning' | 'critical';

export function getTierStatus(
  currentPct: number,
  minPct: number,
  targetPct: number,
  maxPct: number
): TierStatus {
  if (currentPct < minPct || currentPct > maxPct) return 'critical';
  const buffer = (maxPct - minPct) * 0.1; // 10% of band = warning zone
  if (currentPct < minPct + buffer || currentPct > maxPct - buffer) return 'warning';
  return 'on-target';
}

export const TIER_STATUS_CLASS: Record<TierStatus, string> = {
  'on-target': 'bg-emerald-500',
  'warning':   'bg-amber-500',
  'critical':  'bg-red-500',
};
```

Map to Tailwind `bg-*` classes. The Midnight Sovereign design system has no named tier-status tokens, so this constants map (similar to existing `SCORE_LABELS` pattern) should live in `constants.ts` or co-located in the Tier page component.

### Crypto (BTC/XMR) as Tier 3 assets — no schema addition

BTC/XMR holdings use `asset_class: 'crypto'`, `tier: 3`, and `current_value` updated manually in-app via the existing PATCH `/api/assets/:id` endpoint. No special type, table, or API route is needed. The `sub_class` column (added in migration 009) can hold `'btc'` or `'xmr'` for display filtering.

### Dealer price displayed in Ledger (MKTD-03)

The LedgerPage fetches `/api/ledger` which joins assets + acquisitions. To show dealer price alongside acquisitions:

1. `preferred_dealer_id` on `assets` links an asset to its primary dealer
2. LedgerPage fetches `/api/dealers` once on mount (small reference table)
3. Component looks up dealer by `asset.preferred_dealer_id` — no new API route, no JOIN required
4. If per-acquisition dealer selection is needed later, a `dealer_id` column on `acquisitions` can be added in v1.2

---

*v1.1 stack additions researched: April 11, 2026*

---

# Stack Research — v1.2 Additions

**Date:** 2026-04-13
**Milestone:** v1.2 — Portfolio Valuation (spot prices, derived valuations, value/premium decomposition, Valuation screen)
**Confidence:** HIGH — all four feature areas are data-CRUD + arithmetic display. No novel tech required.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| PostgreSQL NUMERIC | (existing) | All valuation arithmetic | Compute `liquidation_value`, `metal_value`, and `premium` in SQL using exact NUMERIC operands — not in JS. Three-way multiplication (`price_per_gram × toGrams(weight) × qty`) using NUMERIC columns avoids float accumulation by database guarantee. |
| Knex.js | (existing ^3.1) | New `spot_prices` migration + query builder | One new migration file. `DISTINCT ON (metal) ORDER BY metal, price_date DESC` for latest-price-per-metal query supported via raw Knex or `.distinctOn(['metal'])`. |
| Node.js `parseFloat()` | (existing) | Surfaces computed NUMERIC results from pg into TypeScript | PostgreSQL returns NUMERIC columns as strings. Existing pattern: `parseFloat(row.price_per_gram)` → `Intl.NumberFormat('nl-NL', {style:'currency', currency:'EUR'})` is correct — storage is exact, display is rounded. No change needed. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **recharts** | ^2.12 | Cash flow timeline bar chart | **Conditional — add only if** the cash flow section requires a time-series bar chart (e.g. capital deployed grouped by acquisition month). If the section is KPI cards only (3 numbers: deployed / returned / P&L), skip entirely. Zero deps with Recharts: custom SVG `<path>` arcs suffice for simple visual comparisons. |
| **big.js** | ^6.2 | Multi-step decimal arithmetic in the browser | **Conditional — add only if** live "preview before save" math must run entirely in React (e.g. an inline premium calculator in the acquisition modal). 3 kB gzip. API: `new Big(price).times(weight).times(qty).toFixed(2)`. Skip if all arithmetic stays in PostgreSQL. |

**Both conditionals are likely unnecessary for v1.2 scope.** Verify against requirements before adding either.

## What NOT to Add

| Library | Reason to Exclude |
|---------|------------------|
| **decimal.js** | 15 kB for features this app will never use (trigonometric functions, arbitrary exponents, configurable rounding modes). If a decimal lib is ever needed, `big.js` (3 kB) is the correct scope. |
| **dinero.js v2** | Designed for multi-currency monetary semantics and allocation splits. This app is EUR-only and already uses `Intl.NumberFormat('nl-NL', 'EUR')`. Adds ~12 kB and a paradigm shift for zero gain. |
| **date-fns / dayjs** | Spot prices use ISO date strings (`YYYY-MM-DD`) from a PostgreSQL `DATE` column. No timezone math, no duration arithmetic, no relative-time display is required. `new Date().toISOString().split('T')[0]` for "today" and `<input type="date">` for UI input is sufficient. |
| **Chart.js / react-chartjs-2** | Canvas-based, imperative API — harder to theme with Tailwind CSS variables than SVG-based Recharts. Not worth the paradigm switch if a chart is ever needed. |
| **Nivo / Victory / visx** | Nivo (~1 MB) and Victory are oversized. visx requires composing low-level SVG primitives — correct for bespoke data art, overkill for a single portfolio bar chart. |
| **Tanstack Query / SWR** | Spot prices follow the existing dealer pattern: fetch on mount, store in local useState. No polling, no cache invalidation, no optimistic updates. Adding a caching layer for a single-user local tool adds indirection with no reliability benefit. |
| **Zod / yup** | Manual spot-price entry has 3 fields: metal (enum select), price (number input), date (date input). Inline validation guards in the component and API layer are proportionate and already the established convention. |
| **Redux / Zustand** | No cross-page shared mutable state. Spot prices can be fetched locally in ValuationPage or passed from App.tsx — same as how `dealers` and `tierConfig` are handled now. |

## Integration Notes

### New DB migration: `spot_prices` table

Follows the exact conventions from migrations 001–020. New file: `migrations/021_spot_prices.ts`.

```typescript
import type { Knex } from 'knex';

// Manually-entered spot prices per metal per day.
// UNIQUE(metal, price_date) — one price per metal per day (upsert semantics).
// price_per_gram NUMERIC(10,4) — matches dealer price column precision.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists('spot_prices', (table) => {
    table.increments('id').primary();
    table.string('metal', 3).notNullable();              // 'XAU' | 'XAG' | 'XPT' | 'XPD'
    table.decimal('price_per_gram', 10, 4).notNullable();
    table.date('price_date').notNullable();
    table.timestamps(true, true);
    table.unique(['metal', 'price_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('spot_prices');
}
```

Latest-price-per-metal query (pure Knex, no raw SQL):

```typescript
knex('spot_prices')
  .distinctOn(['metal'])
  .orderBy([{ column: 'metal' }, { column: 'price_date', order: 'desc' }])
  .select('metal', 'price_per_gram', 'price_date')
```

### New API route: `/api/spot-prices`

Follows pattern of `routes/dealers.ts`. Mount in `routes/index.ts`.

```
GET  /api/spot-prices           → latest price per metal (4 rows max)
GET  /api/spot-prices/history   → all rows, desc date (for admin table)
POST /api/spot-prices           → upsert { metal, price_per_gram, price_date }
```

Upsert pattern using Knex `onConflict`:

```typescript
await knex('spot_prices')
  .insert({ metal, price_per_gram, price_date })
  .onConflict(['metal', 'price_date'])
  .merge(['price_per_gram', 'updated_at']);
```

### Derived valuation arithmetic — push to PostgreSQL

All three value dimensions should be returned pre-computed from a single API endpoint (e.g. `GET /api/valuation/summary`). Doing this in SQL means NUMERIC exact arithmetic; no JS decimal lib is needed.

Conceptual shape (adapt to actual column names):

```sql
SELECT
  a.id,
  a.name,
  -- Liquidation: dealer We Buy price × weight × qty
  COALESCE(
    d.we_buy_gold_per_gram * toGrams(a.weight_per_unit, a.weight_unit) * SUM(acq.quantity),
    0
  ) AS liquidation_value,
  -- Cost basis: sum of all acquisition cost_basis for this asset
  SUM(acq.cost_basis) AS total_cost,
  -- Metal value: latest spot price × weight × qty
  COALESCE(
    sp.price_per_gram * toGrams(a.weight_per_unit, a.weight_unit) * SUM(acq.quantity),
    0
  ) AS metal_value
  -- Premium (computed client-side): total_cost - metal_value
FROM assets a
LEFT JOIN acquisitions acq ON acq.asset_id = a.id
LEFT JOIN dealers d ON d.id = a.preferred_dealer_id
LEFT JOIN (
  SELECT DISTINCT ON (metal) metal, price_per_gram
  FROM spot_prices ORDER BY metal, price_date DESC
) sp ON sp.metal = a.sub_class -- 'gold'/'silver'/... mapped to 'XAU'/'XAG'
GROUP BY a.id, d.we_buy_gold_per_gram, sp.price_per_gram
```

> `toGrams()` — implement as a SQL CASE expression or call it in JS after fetching weight + weight_unit. Since `weight_unit` is either `'g'` or `'oz'` and the conversion factor (31.1035) is a constant, a SQL expression is simple: `CASE WHEN a.weight_unit = 'oz' THEN a.weight_per_unit * 31.1035 ELSE a.weight_per_unit END`.

### Decimal precision — definitive decision table

| Scenario | Approach | Reason |
|----------|----------|--------|
| Valuation totals in API response | Compute in SQL with NUMERIC operands | Exact by database guarantee |
| Per-row display in React (from API string) | `parseFloat(row.value)` → `Intl.NumberFormat` | Rounding to 2 dp at display eliminates float noise from string→number conversion |
| Live preview in modal (before API save) | `Math.round(parseFloat(p) * parseFloat(w) * qty * 100) / 100` | Fast, no library, correct for EUR×grams at this precision |
| Running sum across many acquisitions | SQL `SUM()` on NUMERIC columns | Avoids accumulation error across N rows — never sum in JS |

**No decimal library needed** if the above dispatch is followed.

### New types (append to `frontend/src/types.ts`)

```typescript
export interface SpotPrice {
  id: number;
  metal: 'XAU' | 'XAG' | 'XPT' | 'XPD';
  price_per_gram: string;   // NUMERIC as string — parseFloat() at use site
  price_date: string;       // ISO date: '2026-04-13'
  created_at: string;
  updated_at: string;
}

export interface ValuationSummary {
  total_liquidation_value: string;  // NUMERIC as string
  total_cost_basis: string;
  total_metal_value: string;
  // premium computed client-side: parseFloat(total_cost_basis) - parseFloat(total_metal_value)
  by_asset: AssetValuationRow[];
}

export interface AssetValuationRow {
  asset_id: number;
  asset_name: string;
  sub_class: string | null;
  liquidation_value: string;
  total_cost: string;
  metal_value: string;
  // quantity + weight surfaced from asset for display
  total_quantity: string;
  weight_per_unit: string | null;
  weight_unit: string | null;
}
```

### Navigation: ValuationPage mount point

No React Router. Add `'valuation'` to the discriminated union `View` type in `App.tsx` and render `<ValuationPage>` conditionally. Follow identical pattern to `TierPage` (added in v1.1). Pass `onNavigate` callback as a prop — no import coupling between pages.

---

*v1.2 stack research completed: 2026-04-13*

---

## v1.3 Stack Addendum — Crypto Asset Tracking

**Researched:** 2026-04-13  
**Scope:** What stack additions or changes are needed for crypto quantity tracking, manual spot prices per coin, and crypto storage location types?

### Verdict: No New Libraries

Every v1.3 requirement is satisfied by **schema migrations alone**. The existing stack has all required capabilities. This is a data model extension, not a capability gap.

| Requirement | Satisfied By | Action |
|-------------|-------------|--------|
| Crypto quantity (2.5 XMR, 3 PAXG) | `acquisitions.quantity DECIMAL(20,6)` (migration 005) | No change |
| Coin type (XMR, PAXG, XAUT sub_class) | `assets.sub_class VARCHAR(50)` (migration 009) | No change |
| Manual spot price per coin | Extend the v1.2 `spot_prices` table with crypto rows | Migration or rows only |
| Spot price math (qty × price) | Plain JS — same as metals | No library |
| Gold-backed token metadata (PAXG = 1 oz gold) | Reuse `assets.weight_per_unit` + `weight_unit` | Convention only |
| Crypto storage location types | Add `location_type` column to `asset_locations` | Migration only |
| Precision arithmetic | PostgreSQL DECIMAL; `Intl.NumberFormat('nl-NL')` for display | No library |

### spot_prices table coordination

v1.2 ships a `spot_prices` table for metals (XAU/XAG/XPT/XPD). Verify its schema before writing a v1.3 migration.

**If v1.2 `spot_prices` uses a `metal` column typed as `'XAU' | 'XAG' | 'XPT' | 'XPD'`** (as shown in the v1.2 TypeScript types above), v1.3 needs one migration to rename/generalize the key column:

```sql
-- Option A: rename 'metal' → 'asset_key', widen to VARCHAR(20)
ALTER TABLE spot_prices RENAME COLUMN metal TO asset_key;
-- existing rows: 'XAU', 'XAG', 'XPT', 'XPD'
-- new rows: 'XMR', 'PAXG', 'XAUT', 'BTC', etc.

-- Option B: if the column is already VARCHAR with no enum DB constraint, just insert crypto rows
INSERT INTO spot_prices (asset_key, price_per_gram, price_date) VALUES ('XMR', 145.00, NOW());
```

Check whether `price_per_gram` is semantically correct for crypto (`price_per_gram` is misleading for XMR/BTC). Rename to `price_per_unit` and add a `base_unit` column (`'gram'` for metals, `'token'` for crypto) if the v1.2 column has that name embedded:

```sql
ALTER TABLE spot_prices RENAME COLUMN price_per_gram TO price_per_unit;
ALTER TABLE spot_prices ADD COLUMN base_unit VARCHAR(20) NOT NULL DEFAULT 'gram';
UPDATE spot_prices SET base_unit = 'gram' WHERE asset_key IN ('XAU','XAG','XPT','XPD');
```

**If v1.2 already uses a generic `price_per_unit` / `asset_key` naming**, just insert crypto rows. Zero migration needed.

**Why DECIMAL(20,8) for crypto prices?** XMR at ~€150 and PAXG at ~€2,800 don't need 8dp for the price, but it future-proofs against sub-euro tokens without a schema change. Storage cost: negligible (< 20 rows total, ever).

### location_type on asset_locations

```sql
-- Migration 022 (or next available number after v1.2 migrations)
ALTER TABLE asset_locations ADD COLUMN location_type VARCHAR(30);
```

Valid values — enforced by frontend enum, not a DB constraint (consistent with rest of schema):

| Value | Display |
|-------|---------|
| `vault` | Vault |
| `bank` | Bank |
| `home` | Home / Safe |
| `exchange` | Exchange |
| `software_wallet` | Software Wallet |
| `hardware_wallet` | Hardware Wallet |
| `cold_storage` | Cold Storage |
| `on_chain` | On-Chain |

Existing rows default to `null`; UI falls back to displaying `name`/`custodian_name` as before.

### Gold-backed token classification (PAXG, XAUT)

No new DB column needed. Use existing fields:

| Field | PAXG / XAUT | Pure crypto (XMR) |
|-------|-------------|-------------------|
| `asset_class` | `'crypto'` | `'crypto'` |
| `sub_class` | `'paxg'` or `'xaut'` | `'xmr'` |
| `product_type` | `'gold_token'` | `'coin'` |
| `weight_per_unit` | `1` | `null` |
| `weight_unit` | `'oz'` | `null` |

**Pricing path for v1.3:** Enter PAXG/XAUT spot in EUR/token directly in `spot_prices` (same as XMR). The `product_type = 'gold_token'` field is metadata for a UI badge ("gold-backed") without driving any pricing logic from it. If a future phase wants PAXG to auto-track XAU price, the `weight_per_unit = 1oz` field is already there — no schema change required.

### What NOT to Add

| Library | Reason to reject |
|---------|-----------------|
| `ethers.js` / `viem` / `web3.js` | No RPC calls. Manual entry only. ~2MB bundle for zero benefit. |
| `bignumber.js` / `decimal.js` | PostgreSQL DECIMAL handles precision. No financial math in JS. |
| CoinGecko / Binance / any price API | Hard constraint from PROJECT.md: "Live price feeds — deferred." |
| `crypto-js` / `bitcoinjs-lib` | Not a wallet. No address generation or key ops. |
| `zod` / runtime validation | Not used elsewhere; stay consistent with existing route-level checks. |
| Any new React data-fetching library | Existing `api.ts` + component state covers all patterns. |

### New TypeScript types for types.ts

```typescript
// Extend SpotPrice (if v1.2 named it for metals only, generalize)
export interface SpotPrice {
  id: number;
  asset_key: string;            // 'XAU' | 'XAG' | 'XMR' | 'PAXG' | 'XAUT' | ...
  price_per_unit: string;       // NUMERIC as string
  base_unit: 'gram' | 'token' | 'troy_oz';
  price_date: string;
  updated_at: string;
}

// Extend AssetLocation
export interface AssetLocation {
  // ... existing fields ...
  location_type: 'vault' | 'bank' | 'home' | 'exchange' | 'software_wallet' |
                 'hardware_wallet' | 'cold_storage' | 'on_chain' | null;
}
```

### Migration numbering

v1.2 ends at migration 019 (backfill_snapshots). The v1.2 valuation work likely adds 020–02x. Coordinate with v1.2 completion before writing v1.3 migration numbers. Acquire the next available file prefix at implementation time.

---

*v1.3 crypto stack addendum completed: 2026-04-13*
