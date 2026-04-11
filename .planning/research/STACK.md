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
