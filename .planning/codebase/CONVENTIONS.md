# CONVENTIONS.md — Code Style & Conventions

## Status: Pre-Implementation

No application code exists yet. All conventions below are **prescribed** in:
- `.github/copilot-instructions.md` — primary architecture rules
- `.github/instructions/frontend-coding-standards.instructions.md` — frontend design philosophy and code standards
- `.github/instructions/frontend-architect-behavior.instructions.md` — AI agent behavioral contract
- `PRD.md` — product design requirements

---

## Design Philosophy: Intentional Minimalism

The codebase must embody **"The Sovereign Vault"** — a private banking terminal aesthetic, not consumer fintech. Core directives:

- **Anti-Generic:** Reject standard bootstrapped layouts. If it looks like a template, it is wrong.
- **Reduction is sophistication.** Every added element must justify its presence.
- **No UI library unless present** — if Shadcn/Radix/MUI exists, it MUST be used (do not hand-roll primitives). Currently no UI library specified — custom CSS.
- Styling: Tailwind CSS + custom design token extension. Never mix utility and custom styles arbitrarily.

---

## Frontend Conventions

### Component Structure
```typescript
// Pages: full-page views accepting only navigation callbacks
// frontend/src/pages/DashboardPage.tsx
interface DashboardPageProps {
  onNavigateToLedger: () => void;
  onNavigateToAnalytics: () => void;
  // ... etc
}

// Components: reusable, no page imports
// frontend/src/components/AssetCard.tsx
```

### Navigation
```typescript
// App.tsx — discriminated union, conditional rendering
type View =
  | { page: 'dashboard' }
  | { page: 'ledger' }
  | { page: 'analytics' }
  | { page: 'assets' }
  | { page: 'tax' }
  | { page: 'business-personal' }

// NEVER: import LedgerPage from '../pages/LedgerPage' inside DashboardPage
// ALWAYS: pass onNavigateToLedger callback as prop
```

### API Calls
```typescript
// frontend/src/api.ts — single request() helper
// ALL fetch calls go through api.* methods

// CORRECT:
const assets = await api.getAssets();

// WRONG:
const response = await fetch('/api/assets'); // Never inline fetch
```

### Error Shape
```typescript
// API error shape: { error: { message: string, status: number } }
// request() helper extracts error.message and throws it
// Components catch the thrown string
```

### Types
```typescript
// frontend/src/types.ts — single source of truth
// Use Pick<T, ...> and Partial<> for input/update types

// CORRECT:
type CreateAsset = Pick<Asset, 'name' | 'class' | 'entityId'>;

// WRONG:
interface CreateAssetInput { name: string; class: string; entityId: number; }
// (duplication)
```

---

## Score Scale Convention

Scores are stored as integers 1–5:
```typescript
const SCORE_LABELS = ['Extra Low', 'Low', 'Medium', 'High', 'Critical'];
// Usage: SCORE_LABELS[score - 1]
```

Assets carry: gross score, net score, and mitigations (portfolio capital-weighted).

---

## API (Backend) Conventions

### Route Structure
```typescript
// api/src/routes/assets.ts
// Nested resources as sub-routes on parent router:
assetsRouter.use('/:assetId/scores', scoresRouter);    // Not top-level
assetsRouter.use('/:assetId/mitigations', mitigationsRouter);

// Route prefixes: ALL /api/... except /health
// app.use('/api/assets', assetsRouter);  // Correct
```

### Error Handling
```typescript
// api/src/middleware/errorHandler.ts — MUST be last middleware
// Returns: { error: { message: string, status: number } }
```

### Migrations
```typescript
// api/migrations/001_create_assets.ts
// Always use:
await knex.schema.createTableIfNotExists('assets', (t) => { ... });
// Never: createTable (will throw if exists)
```

---

## Visual / UX Conventions

### Color Usage Rules
| Color | Token | When to use |
|-------|-------|------------|
| Gold | `primary: #e9c349` | Primary actions, wealth indicators — sparingly |
| Emerald | `secondary: #4edea3` | Positive P&L, growth indicators ONLY |
| Slate | `tertiary: #b9c7e0` | Secondary data, metadata |
| Error red | `error: #ffb4ab` | Negative performance, errors |

### Forbidden Patterns
- **No 1px solid borders** for structural separation — use surface nesting instead
- **No pure black `#000000`** — use midnight blues
- **No large corner radii** — `sm` or `md` only (not pill shapes), except status chips
- **No generic layouts** — asymmetry and bespoke structure required
- **No inline `fetch()`** in components

### Required Patterns
- **Glassmorphism** for modals/floating elements: `backdrop-blur: 24px`, surface at 70% opacity
- **Tabular numbers** on all financial figures: `font-variant-numeric: tabular-nums`
- **Newsreader** for display/headline text; **Inter** for all data/UI
- **Extreme whitespace** — interfaces should feel "expensive"
- **Surface nesting** for depth: `surface-container-lowest` → `surface-container-low` → `surface-container-high` → `surface-container-highest`

### Micro-Interactions
- Hover states, focus rings, and transitions must be **intentional** — every one has a purpose
- Active state = surface shift (not border); `surface-container-low` → `surface-container-high`
- Positive trend sparklines: `secondary` color + `drop-shadow` glow. Negative: `error`, no glow.

---

## Semantic HTML Requirement
- Semantic HTML5 always (`<main>`, `<section>`, `<article>`, `<nav>`, `<header>`, etc.)
- `<div>` soup is a failure state

---

## AI Agent Behavioral Contract (`.github/instructions/frontend-architect-behavior.instructions.md`)

When agents work on this codebase:
1. Execute requests immediately — no unsolicited advice
2. Every response: 1-sentence rationale → code
3. `ULTRATHINK` trigger: engage exhaustive multi-dimensional reasoning (psychological, technical, accessibility WCAG AAA, scalability)
