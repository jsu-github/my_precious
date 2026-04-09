# STRUCTURE.md — Directory Layout & Organization

## Status: Pre-Implementation

The application source directories (`api/`, `frontend/`, docker files, Makefile) do not exist yet. This document captures the **current state** of the repository and the **intended structure** as defined in `.github/copilot-instructions.md`.

---

## Current Repository State

```
precious_dashboard/
├── PRD.md                          # Product Requirements Document (complete)
├── data/
│   ├── db/                         # Empty — PostgreSQL data mount point
│   └── import/                     # Empty — import staging area
├── .git/
├── .github/
│   ├── copilot-instructions.md     # Workspace-level architecture spec + conventions
│   └── instructions/
│       ├── frontend-architect-behavior.instructions.md
│       └── frontend-coding-standards.instructions.md
│   └── skills/
│       ├── dashboard/SKILL.md
│       ├── frontend-design/SKILL.md
│       └── react-best-practices/SKILL.md
├── .planning/
│   ├── codebase/                   # This map (just created)
│   └── phases/                     # Empty — no phases planned yet
└── .stitch/
    ├── design-system/
    │   ├── DESIGN_SYSTEM.md        # Human-readable design specification
    │   └── midnight-sovereign.json  # Machine-readable design tokens
    └── screens/
        ├── global-net-worth-dashboard/
        │   ├── index.html          # Full-fidelity HTML mockup
        │   └── screenshot.png
        ├── transaction-ledger/
        │   ├── index.html
        │   └── screenshot.png
        ├── performance-analytics/
        │   ├── index.html
        │   └── screenshot.png
        ├── asset-locations-inventory/
        │   ├── index.html
        │   └── screenshot.png
        ├── tax-compliance-center/
        │   ├── index.html
        │   └── screenshot.png
        └── business-vs-personal-breakdown/
            ├── index.html
            └── screenshot.png
```

---

## Intended Application Structure (per `copilot-instructions.md`)

Once implementation begins, the target structure is:

```
precious_dashboard/
├── Makefile                        # Dev/prod commands
├── docker-compose.yml              # Full stack orchestration
├── api/
│   ├── src/
│   │   ├── index.ts                # Express app setup + startup
│   │   ├── db.ts                   # Knex singleton + runMigrations()
│   │   ├── routes/                 # One file per resource
│   │   └── middleware/
│   │       └── errorHandler.ts     # MUST be last middleware
│   └── migrations/                 # Sequential numbered Knex migrations
└── frontend/
    └── src/
        ├── api.ts                  # ALL fetch calls — single request() helper
        ├── types.ts                # ALL shared types — single source of truth
        ├── App.tsx                 # Root — discriminated union View state + navigation
        ├── pages/                  # Full-page views (one per screen)
        └── components/             # Reusable components
```

---

## Key Location Rules

| What | Where | Rule |
|------|-------|------|
| All API calls | `frontend/src/api.ts` | Never use inline `fetch()` in components |
| All shared types | `frontend/src/types.ts` | Never duplicate; use `Pick<T>` / `Partial<T>` |
| Navigation state | `App.tsx` | Discriminated union; never import pages into pages |
| DB migrations | `api/migrations/` | Sequential numbered files, auto-run on startup |
| Error middleware | `api/src/middleware/errorHandler.ts` | Must be last Express middleware |

---

## Design Artifacts (.stitch/)

The `.stitch/` directory contains Stitch-generated design references. These are read-only reference material:
- `midnight-sovereign.json` — design tokens used to configure Tailwind
- `screens/*/index.html` — full-fidelity HTML mockups (Tailwind Play CDN) for each screen
- `screens/*/screenshot.png` — rendered screenshots

These inform implementation but are not shipped as application code.

---

## Data Directory

`data/db/` — PostgreSQL container data volume mount (empty until first `make dev`)
`data/import/` — staging area for bulk import operations (no content yet, purpose TBD)

---

## Naming Conventions (Intended)

- **Routes files:** kebab-case matching resource name, e.g. `assets.ts`, `acquisitions.ts`
- **Page components:** PascalCase with `Page` suffix, e.g. `DashboardPage.tsx`
- **Shared components:** PascalCase, e.g. `AssetCard.tsx`
- **API methods:** camelCase matching resource + verb, e.g. `api.getAssets()`
- **Migration files:** `NNN_description` numbered sequentially, e.g. `001_create_assets.ts`
