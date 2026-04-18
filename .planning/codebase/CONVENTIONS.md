# CONVENTIONS.md
_Last updated: 2026-04-18_

## Overview
Precious Dashboard uses a consistent set of conventions across TypeScript, React, CSS, and API routes. The frontend is built with Tailwind CSS and a bespoke "Stitch" design system using CSS custom properties. The API follows Express + Knex patterns with centralized error handling. All conventions have been extracted from the actual running codebase.

---

## File & Directory Naming

| Type | Convention | Example |
|------|-----------|---------|
| React page components | PascalCase | `TierPage.tsx`, `DealerPage.tsx` |
| React modal components | PascalCase | `AssetModal.tsx`, `EntityModal.tsx` |
| Utility modules | camelCase | `metalPricing.ts`, `errorHandler.ts` |
| API route files | camelCase | `assets.ts`, `tierConfig.ts` |
| CSS/config files | camelCase | `tailwind.config.ts` |
| Migration files | `NNN_snake_case.ts` | `022_tier_config_entity_scope.ts` |

---

## TypeScript Patterns

**Declare types at the top of each file in a `// ─── Types` section:**
```typescript
// ─── Types ────────────────────────────────────────────────────────────────────
type MetalTab = 'gold' | 'silver' | 'platinum' | 'palladium';

interface DealerFormValues {
  name: string;
  contact_notes: string;
  we_buy_gold_per_gram: string;
}
```

**Use `type` for union/alias types; `interface` for object shapes:**
```typescript
type TierStatus = 'green' | 'amber' | 'red' | 'unset';
interface TierAllocationChartsProps { ... }
```

**Component Props interface is always named `Props`:**
```typescript
interface Props {
  entityFilter: EntityFilter;
  onNavigate?: (view: View) => void;
}
export default function DashboardPage({ entityFilter, onNavigate }: Props) { ... }
```

**Use `Record<K, V>` for lookup maps:**
```typescript
const TIER_LABELS: Record<number, string> = { 0: 'Grid-Down Baseline', ... };
const STATUS_COLORS: Record<TierStatus, string> = { green: '#059669', ... };
```

**Use `Partial<Record<K, V>>` for optional lookup maps:**
```typescript
const ASSET_CLASS_TIER_DEFAULTS: Partial<Record<AssetClass, number>> = {
  precious_metals: 2,
  crypto: 3,
};
```

**All shared types live exclusively in `frontend/src/types.ts`.** Never duplicate type definitions in component files. Import them as `import type { ... } from '../types'`.

**404 errors in API routes use typed-cast pattern:**
```typescript
const e: any = new Error('Asset not found'); e.status = 404; throw e;
```

---

## Section Comment Style

Every file uses ASCII banner section comments to organize code. This is mandatory:

```typescript
// ─── Constants ────────────────────────────────────────────────────────────────
// ─── Types ────────────────────────────────────────────────────────────────────
// ─── Helpers ──────────────────────────────────────────────────────────────────
// ─── Sub-components ───────────────────────────────────────────────────────────
// ─── Main Component ───────────────────────────────────────────────────────────
```

Typical section order in page files:
1. `// ─── Types` (local-only types; shared types are in `types.ts`)
2. `// ─── Constants` (lookup maps, label arrays)
3. `// ─── Helpers` (pure utility functions)
4. `// ─── Sub-components` (small presentational components used only here)
5. `// ─── Component` or `// ─── Main Component` (the default export)

---

## React Patterns

**Functional components only.** No class components, ever.

**Hook import line:**
```typescript
import { useState, useEffect, useMemo } from 'react';
```

**State declaration pattern — pair declarations grouped by concern:**
```typescript
const [dealers, setDealers]       = useState<Dealer[]>([]);
const [assets, setAssets]         = useState<Asset[]>([]);
const [loading, setLoading]       = useState(true);
const [pageError, setPageError]   = useState<string | null>(null);
const [editingId, setEditingId]   = useState<number | 'new' | null>(null);
```

**Parallel data fetching with `Promise.all` in `useEffect`:**
```typescript
useEffect(() => {
  setLoading(true);
  Promise.all([api.dealers.list(), api.assets.list()])
    .then(([d, a]) => {
      setDealers(d);
      setAssets(a);
    })
    .catch(err => setPageError(String(err)))
    .finally(() => setLoading(false));
}, []);
```

**Derived/computed values with `useMemo`:**
```typescript
const selectedDealer = useMemo(
  () => dealers.find(d => d.id === selectedDealerId) ?? null,
  [dealers, selectedDealerId],
);
```

**Form submission with `async function handleSubmit`:**
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSaving(true);
  setError(null);
  try {
    const saved = isEdit
      ? await api.assets.update(asset!.id, form)
      : await api.assets.create(form);
    onSaved(saved);
  } catch (err) {
    setError(String(err));
  } finally {
    setSaving(false);
  }
}
```

**Sub-components defined in the same file** (before the main export). Only extract to a separate file if used across multiple pages/modals.

**Sub-component props are inline interfaces, not reusing `Props`:**
```typescript
function StatusBadge({ status }: { status: TierStatus }) { ... }
function DealerChip({ dealer, active, onSelect, onEdit }: { dealer: Dealer; active: boolean; ... }) { ... }
```

**Never use React Router.** Navigation uses a discriminated union `View` state in `App.tsx`. Pages receive `onNavigate*` callbacks as props.

---

## API Call Conventions

**All fetch calls go through `api.*` from `frontend/src/api.ts`.** Never call `fetch()` inline in a component.

```typescript
// ✅ Correct
import { api } from '../api';
const data = await api.assets.list();

// ❌ Never do this
const res = await fetch('/api/assets');
```

The `request<T>()` helper in `frontend/src/api.ts` handles auth headers, JSON parsing, and error extraction. It throws `error.message` as a plain string on non-OK responses.

---

## CSS / Tailwind Approach

**Design system: "Stitch" — a light-themed slate palette.** Despite older instructions referencing a dark theme, the implemented system is light-first.

**Color tokens are CSS custom properties in `frontend/src/index.css`:**
```css
:root {
  --color-background:       #F8FAFC;
  --color-surface-low:      #F1F5F9;
  --color-surface-base:     #E2E8F0;
  --color-primary:          #1E293B;
  --color-on-surface:       #1E293B;
  --color-on-surface-muted: #475569;
  --color-outline-variant:  #94A3B8;
  --color-error:            #9f403d;
}
```

**Tailwind theme extension in `frontend/tailwind.config.ts`** maps these tokens to utility classes:
- `text-on-surface`, `text-on-surface-variant` — body text
- `bg-surface-low`, `bg-surface-high`, `bg-surface-highest` — background layers
- `border-outline-variant` — subtle borders
- `text-primary`, `bg-primary` — primary interactive color (#1E293B)
- `text-error`, `bg-error` — error states (#9f403d)

**Typography: two fonts via `@fontsource` (no CDN):**
- `font-sans` / `font-body` / `font-label` → Inter
- `font-headline` → Manrope (use for hero numbers, section titles)

**Component utility classes defined in `@layer components`:**
```css
.glass-panel    /* white card with subtle shadow + rounded-12px */
.card-low       /* surface-low card for secondary containers */
.primary-gradient  /* slate gradient for wordmarks / hero callouts */
```

**Use `.tabular-nums` on all financial data** (numbers that need alignment):
```tsx
<span className="tabular-nums text-on-surface font-semibold">{value}</span>
```

**Opacity floor overrides in `@layer utilities`** — do not fight these with custom `!important`:
```
text-on-surface-variant/30 → actual opacity 0.62 (WCAG AA floor)
text-on-surface-variant/50 → actual opacity 0.76
```

**Conditional className pattern (no external clsx/cn library):**
```typescript
className={[
  'base-class transition-all',
  active ? 'border-primary/50 bg-primary/10' : 'border-outline-variant/30',
].join(' ')}
```

---

## API Route Conventions

**One router per resource file in `api/src/routes/`.** Router is mounted in `api/src/routes/index.ts`.

**Every handler follows the same try/catch/next(err) wrapper:**
```typescript
router.get('/', async (req, res, next) => {
  try {
    const rows = await knex('assets').orderBy('current_value', 'desc');
    res.json(rows);
  } catch (err) { next(err); }
});
```

**Route comment header directly above each handler:**
```typescript
// GET /api/assets?entity_id=N
router.get('/', async (req, res, next) => { ... });

// POST /api/assets
router.post('/', async (req, res, next) => { ... });
```

**PUT handlers snapshot value changes via transaction:**
```typescript
const updated = await knex.transaction(async trx => {
  const [row] = await trx('table').where({ id }).update({ ...req.body, updated_at: trx.fn.now() }).returning('*');
  // side effects (snapshots, logs) also inside trx
  return row;
});
```

**DELETE returns 204 No Content** on success.

---

## Error Handling Conventions

**API (backend):** All errors pass through `next(err)`. The centralized `errorHandler` in `api/src/middleware/errorHandler.ts` — registered last in `api/src/index.ts` — serializes to:
```json
{ "error": { "message": "...", "status": 404 } }
```

For 500+ errors, `console.error('[error]', err)` is called.

**Frontend:** Error state is always `string | null`. Cast errors to string with `String(err)`:
```typescript
const [error, setError] = useState<string | null>(null);
// ...
} catch (err) {
  setError(String(err));
}
```

Display errors with the `ErrorMessage` component from `frontend/src/components/modals/FormFields.tsx`:
```tsx
{error && <ErrorMessage message={error} />}
```

---

## Migration Conventions

Files in `api/migrations/` are numbered sequentially: `001_`, `002_`, ..., `022_`, etc.

Each file exports `up` and `down`:
```typescript
export async function up(knex: Knex): Promise<void> { ... }
export async function down(knex: Knex): Promise<void> { ... }
```

**Always use `createTableIfNotExists` / `dropTableIfExists`.**

**Money/currency columns MUST use `table.decimal('name', 20, 2)`.** Never `table.float()` or `table.double()` for monetary values — these introduce floating-point precision errors.

**Composite primary keys use `.primary([col1, col2])`:**
```typescript
table.primary(['tier_id', 'entity_scope']);
```

**Migrations that seed data must handle the case where existing rows are empty** (fall back to defaults), as shown in `api/migrations/022_tier_config_entity_scope.ts`.

---

## Form Field Conventions

Reusable form primitives live in `frontend/src/components/modals/FormFields.tsx`:
- `<Field label="..." required>` — label wrapper
- `<Input>` — styled `<input>`
- `<Select>` — styled `<select>`
- `<Textarea>` — styled `<textarea>`
- `<FormActions onCancel submitLabel loading>` — Save/Cancel button row
- `<ErrorMessage message>` — error display

All inputs share a single `inputClass` string defined in `FormFields.tsx`. Override only by extending `className`, not by redefining styles inline.

---

## Constants Naming

Module-level lookup maps and arrays use SCREAMING_SNAKE_CASE:
```typescript
const TIER_LABELS: Record<number, string> = { ... };
const STATUS_COLORS: Record<TierStatus, string> = { ... };
const METAL_TABS: { id: MetalTab; label: string }[] = [ ... ];
const TIER_PRESETS: { id: string; label: string; targets: Record<number, number> }[] = [ ... ];
```

Local helper functions use camelCase:
```typescript
function fmtEur(v: number, fractions = 2): string { ... }
function freshnessClass(iso: string): string { ... }
function computeStatus(currentPct: number, minPct: number, maxPct: number): TierStatus { ... }
```

---

## What NOT To Do

- **No React Router** — use `View` discriminated union + `onNavigate*` callbacks
- **No inline `fetch()`** — always go through `api.*` from `frontend/src/api.ts`
- **No UI component libraries** (Shadcn, Radix, MUI) — build bespoke primitives from scratch
- **No `table.float()` / `table.double()` for money** — use `decimal(20, 2)` exclusively
- **No duplicate type definitions** — all shared types belong in `frontend/src/types.ts`
- **No arbitrary pixel values** in Tailwind — use the token scale or CSS custom properties
- **No dark-theme colors** — the "dark-first" language in older instructions is outdated; the implemented palette is light-first (#F8FAFC background)
- **No `clsx` or `cn` utilities** — use array `.join(' ')` pattern for conditional classes
- **No docstrings on utility functions** unless the function is non-obvious (see `metalPricing.ts`)

---

*Convention analysis: 2026-04-18*
