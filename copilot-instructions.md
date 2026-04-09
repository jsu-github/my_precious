<!-- GSD:project-start source:PROJECT.md -->
## Project

**Precious Dashboard — Unified Wealth Command Center**

A private, self-hosted financial command center for a single high-net-worth individual managing wealth across personal investments, a business entity (Sovereign-LLC), and multiple international jurisdictions. It replaces fragmented spreadsheets with a single source of truth — purpose-built for legal entity separation, jurisdictional custody tracking, and batch-level performance visibility. No auth, no cloud, no external dependencies in v1.

**Core Value:** A single **Global Net Worth Dashboard** showing total financial position across all entities and asset classes — accurate enough to trust, fast enough to open daily.

### Constraints

- **No auth**: Single-user tool, backend trusts all requests — do not add auth complexity
- **No live price feeds (v1)**: All asset valuations are manually entered integers/decimals
- **Docker-only runtime**: No local Node/Postgres setup — everything runs via `make dev`
- **Existing design system**: Midnight Sovereign tokens must be used; no design system changes
- **No React Router**: Navigation is discriminated union state in App.tsx — enforce this convention
- **English only**: No i18n infrastructure
- **API port**: Must pick either 3001 (copilot-instructions) or 3040 (PRD) before implementation begins
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Status: Pre-Implementation
## Planned Application Stack
### Frontend
| Concern | Technology |
|---------|-----------|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS (custom token extension) |
| Icons | Material Symbols Outlined (Google Fonts CDN) |
| Typography | Newsreader (serif) + Inter (sans) via Google Fonts |
| PWA | Yes — installable |
| Port | 3000 |
### API
| Concern | Technology |
|---------|-----------|
| Runtime | Node.js |
| Framework | Express + TypeScript |
| Port | 3001 (copilot-instructions) / 3040 (PRD — discrepancy to resolve) |
### Database
| Concern | Technology |
|---------|-----------|
| Engine | PostgreSQL 16 |
| Query layer | Knex.js (migrations + query builder) |
### Runtime
| Concern | Technology |
|---------|-----------|
| Orchestration | Docker Compose |
| Dev workflow | `make dev` (hot reload) |
| Prod workflow | `make up` (detached) |
## Confirmed via Screen Mockups (.stitch/screens/)
- `https://cdn.tailwindcss.com?plugins=forms,container-queries` (Tailwind CSS Play CDN)
- Google Fonts: `Inter:wght@300;400;500;600;700` + `Newsreader:ital,opsz,wght@...`
- Google Fonts: `Material+Symbols+Outlined`
## Design System Tokens (`.stitch/design-system/midnight-sovereign.json`)
| Token | Value |
|-------|-------|
| Color mode | DARK |
| Primary (Gold) | `#e9c349` |
| Secondary (Emerald) | `#4edea3` |
| Tertiary (Slate) | `#b9c7e0` |
| Background | `#0b1326` |
| Surface low | `#131b2e` |
| Surface high | `#222a3d` |
| Surface highest | `#2d3449` |
| Error | `#ffb4ab` |
| Headline font | Newsreader |
| Body/label font | Inter |
| Roundness | ROUND_FOUR (`border-radius: 4px` base) |
| Spacing scale | 3 |
## Development Commands (from `.github/copilot-instructions.md`)
## Configuration Notes
- No auth — single-user personal tool; backend trusts all requests
- No live price feeds in v1 — all asset values entered manually (PRD lists live prices as a feature, instructions say manual; this is a v1 constraint to resolve)
- No i18n — English only
- No mobile-native app — PWA only
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Status: Pre-Implementation
- `.github/copilot-instructions.md` — primary architecture rules
- `.github/instructions/frontend-coding-standards.instructions.md` — frontend design philosophy and code standards
- `.github/instructions/frontend-architect-behavior.instructions.md` — AI agent behavioral contract
- `PRD.md` — product design requirements
## Design Philosophy: Intentional Minimalism
- **Anti-Generic:** Reject standard bootstrapped layouts. If it looks like a template, it is wrong.
- **Reduction is sophistication.** Every added element must justify its presence.
- **No UI library unless present** — if Shadcn/Radix/MUI exists, it MUST be used (do not hand-roll primitives). Currently no UI library specified — custom CSS.
- Styling: Tailwind CSS + custom design token extension. Never mix utility and custom styles arbitrarily.
## Frontend Conventions
### Component Structure
### Navigation
### API Calls
### Error Shape
### Types
## Score Scale Convention
## API (Backend) Conventions
### Route Structure
### Error Handling
### Migrations
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
## Semantic HTML Requirement
- Semantic HTML5 always (`<main>`, `<section>`, `<article>`, `<nav>`, `<header>`, etc.)
- `<div>` soup is a failure state
## AI Agent Behavioral Contract (`.github/instructions/frontend-architect-behavior.instructions.md`)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Status: Pre-Implementation
## Architectural Pattern
```
```
## Layers
### 1. Frontend — React 18 + TypeScript + Vite 5
```typescript
```
### 2. API — Node.js + Express + TypeScript
### 3. Database — PostgreSQL 16
## Planned Data Model (PRD Section 6.1)
| Entity | Description |
|--------|-------------|
| `Asset` | Physical or financial holding — class, custodian, location, legal entity, specs |
| `Acquisition` | Purchase event — date, cost basis, quantity, legal entity |
| `Location` | Physical custody site — country, custodian, security class, audit config |
| `Entity` | Legal ownership entity — personal or corporate (e.g. Sovereign-LLC) |
| `FiscalTag` | Asset classification for tax reporting |
| `PriceFeed` | Live market price per asset type (deferred v1) |
| `Transfer` | Cross-entity internal transaction log |
## Score System (Carried Over from Existing Convention)
- 5-point enum scale: 1–5 → Extra Low / Low / Medium / High / Critical
- Scores stored as integers; labels derived in frontend via `SCORE_LABELS[score - 1]`
- Assets carry gross/net scores + mitigations
- Capital-weighted portfolio scoring
## Key Architecture Rules (from copilot-instructions.md)
## Docker Compose Architecture
```
```
## Six Screens (Visual Architecture)
| Screen | Page Component | Primary Data |
|--------|---------------|-------------|
| Global Net Worth Dashboard | `DashboardPage` | All entities aggregate |
| Transaction Ledger | `LedgerPage` | Acquisitions |
| Performance & Analytics | `AnalyticsPage` | Acquisitions + PriceFeed |
| Asset Locations & Inventory | `AssetsPage` | Assets + Locations |
| Tax & Compliance Center | `TaxPage` | Assets + FiscalTags |
| Business vs. Personal Breakdown | `BusinessPersonalPage` | Entities + Assets |
## Entity/View Toggle (Global Pattern)
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
