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
