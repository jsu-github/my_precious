# Precious Dashboard — Unified Wealth Command Center

## What This Is

A private, self-hosted financial command center for a single high-net-worth individual managing wealth across personal investments, a business entity (Sovereign-LLC), and multiple international jurisdictions. It replaces fragmented spreadsheets with a single source of truth — purpose-built for legal entity separation, jurisdictional custody tracking, and batch-level performance visibility. No auth, no cloud, no external dependencies in v1.

## Core Value

A single **Global Net Worth Dashboard** showing total financial position across all entities and asset classes — accurate enough to trust, fast enough to open daily.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Global net worth view showing total combined valuation across all entities and asset classes
- [ ] Entity toggle: switch between Personal / Business / Combined views (all screens respond)
- [ ] Transaction Ledger with filterable acquisition history (asset class, entity, jurisdiction, audit status)
- [ ] Performance & Analytics with batch-level P&L and ROI drill-down
- [ ] Asset Locations & Inventory with jurisdictional custody tracking and audit status
- [ ] Tax & Compliance Center with fiscal tagging and compliance score
- [ ] Business vs. Personal Breakdown with strict entity separation and consolidated view
- [ ] Excel bulk import for initial asset/acquisition data loading
- [ ] In-app CRUD forms for ongoing asset and acquisition management
- [ ] Manual asset valuations (no live price feeds in v1)
- [ ] CSV/PDF export for ledger and fiscal reports
- [ ] Docker Compose local deployment with hot-reload dev workflow

### Out of Scope

- Live price feeds (precious metals, crypto, equities) — deferred post-v1; all values entered manually
- Multi-user access / authentication — single-user personal tool, backend trusts all requests
- Mobile native app — PWA only
- Automated broker/exchange integrations — manual entry and import only
- Notifications / market threshold alerts — deferred
- i18n / localization — English only
- Multi-tenancy — single user, fully local

## Context

**Design system is complete.** The `.stitch/` directory contains full-fidelity HTML mockups for all 6 screens and a machine-readable `midnight-sovereign.json` design token file. The visual language ("The Sovereign Vault") is defined and non-negotiable: dark-first, editorial, Newsreader serif headlines, Inter tabular data, gold/emerald/slate accents, no 1px borders, surface nesting for depth.

**Architecture is specified.** The stack (React 18 + TypeScript + Vite, Express + TypeScript, PostgreSQL 16 + Knex.js, Docker Compose) and all major conventions are documented in `.github/copilot-instructions.md`. Navigation uses a discriminated union `View` state in `App.tsx` — no React Router. All API calls through a single `request()` helper in `api.ts`. All types in `types.ts`.

**Codebase map exists.** `.planning/codebase/` documents the pre-implementation state — stack, architecture, conventions, concerns. Key concern to resolve: API port conflict between PRD (3040) and copilot-instructions (3001).

**Legal entity model.** The user manages two entities: personal holdings and Sovereign-LLC (corporate). Entity separation is legally significant — data must never commingle in reports or exports.

**Asset classes in scope:** Precious metals, Real estate, Public equities, Private equity, Crypto/digital, Fixed income, Exotics/collectibles.

**Jurisdictions in scope:** CH (Switzerland), NL (Netherlands), SG (Singapore), domestic.

## Constraints

- **No auth**: Single-user tool, backend trusts all requests — do not add auth complexity
- **No live price feeds (v1)**: All asset valuations are manually entered integers/decimals
- **Docker-only runtime**: No local Node/Postgres setup — everything runs via `make dev`
- **Existing design system**: Midnight Sovereign tokens must be used; no design system changes
- **No React Router**: Navigation is discriminated union state in App.tsx — enforce this convention
- **English only**: No i18n infrastructure
- **API port**: Must pick either 3001 (copilot-instructions) or 3040 (PRD) before implementation begins

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Manual valuations in v1 | Ship faster; live feeds add integration complexity without changing core UX | — Pending |
| Excel as import format | User's existing data is in Excel; bulk import needed before app is usable | — Pending |
| No React Router | Deliberate architectural choice; discriminated union is simpler at this scale | — Pending |
| Global Net Worth as v1 core | If one thing works perfectly, it's the dashboard — everything else feeds it | — Pending |
| API port (3001 vs 3040) | Conflict between PRD and copilot-instructions — must resolve before Docker wiring | — Pending |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: April 9, 2026 after initialization*
