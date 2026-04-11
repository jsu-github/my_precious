# Precious Dashboard — Unified Wealth Command Center

## What This Is

A private, self-hosted financial command center for managing physical precious metals, cash, and multi-entity wealth across vault locations and jurisdictions. Replaces fragmented spreadsheets with a single source of truth — six working screens, EUR-denominated, fully local, no auth, no cloud. Shipped as a PWA with Excel/CSV import for bulk data loading and in-app CRUD for ongoing management.

## Core Value

A single **Global Net Worth Dashboard** showing total financial position across all entities and asset classes — accurate enough to trust, fast enough to open daily.

## Current Milestone: v1.1 — Market Intelligence & Sovereign Tier System

**Goal:** Add manually-maintained dealer buy prices for gold and a 4-tier sovereign portfolio risk allocation system with configurable target/min/max bounds and status indicators.

**Target features:**
- Dealer price management ("We Buy" bid prices per dealer for gold)
- Tier tagging per asset (Tier 0–3)
- Crypto holdings (BTC/XMR) as Tier 3 assets with manual value entry
- Tier configuration (target %, min %, max % per tier — 4 tiers, editable bounds)
- Dedicated Tier page with allocation vs target and status indicators
- Tier health tile on Dashboard

---

## Requirements

### Validated (v1.0)

- ✓ Global net worth view showing total combined valuation across all entities and asset classes — v1.0
- ✓ Entity toggle: switch between Personal / Business / Combined views (all screens respond) — v1.0
- ✓ Transaction Ledger with filterable acquisition history (asset class, entity, audit status) — v1.0
- ✓ Performance & Analytics with batch-level P&L and ROI drill-down — v1.0
- ✓ Asset Locations & Inventory with jurisdictional custody tracking and audit status — v1.0
- ✓ Tax & Compliance Center with fiscal tagging and compliance score — v1.0
- ✓ Business vs. Personal Breakdown with strict entity separation and consolidated view — v1.0
- ✓ Excel/CSV bulk import for initial asset/acquisition data loading — v1.0
- ✓ In-app CRUD forms for ongoing asset and acquisition management — v1.0
- ✓ Manual asset valuations (no live price feeds in v1) — v1.0
- ✓ Docker Compose local deployment with hot-reload dev workflow — v1.0
- ✓ PWA installable on desktop/mobile — v1.0

### Active (v1.1 — Market Intelligence & Sovereign Tier System)

- [ ] User can create, edit, and delete dealers (company name, contact notes) — MKTD-01
- [ ] User can set a "We Buy" (bid) price per dealer for gold (price per gram) — MKTD-02
- [ ] Ledger shows current dealer buy price alongside acquisitions (selectable dealer) — MKTD-03
- [ ] User can assign a Tier (0–3) to each asset via Edit Asset modal — TIER-01
- [ ] User can add crypto holdings (BTC/XMR) as Tier 3 assets with manual EUR value — TIER-02
- [ ] User can configure target %, minimum %, and maximum % per tier — TIER-03
- [ ] Dedicated Tier page shows current allocation vs targets with green/amber/red status per tier — TIER-04
- [ ] Dashboard shows a Tier health summary tile — TIER-05

### Out of Scope

- Live price feeds (precious metals, crypto, equities) — deferred; all values entered manually
- Multi-user access / authentication — single-user personal tool, backend trusts all requests
- Mobile native app — PWA only
- Automated broker/exchange integrations — manual entry and import only
- Notifications / market threshold alerts — deferred
- i18n / localization — English only
- Multi-tenancy — single user, fully local
- CSV/PDF export for ledger (CSV implemented, PDF deferred to v1.1)

## Context

**v1.0 shipped** — 12 phases, ~4,400 LOC TypeScript, 70 files. Running at `http://10.11.12.27:4000` (host IP; not localhost — server is accessed from another machine).

**Real portfolio loaded.** Seed data replaced with actual Dutch precious metals holdings for J. Suijker Beheer B.V. and J. Suijker Privé: 20 assets, 31 acquisitions across gold/silver/platinum bars and coins at 11 vault locations (Hollandgold NL/CH, Nederlandse Kluis Gouda, Thuis, ABN AMRO, Kluis Amsterdam, Goudverzekerd).

**Currency is EUR throughout.** All `Intl.NumberFormat` calls use `'nl-NL'` locale and `'EUR'` currency. Sub-class (gold/silver/platinum) and product-type (bar/coin) columns added via migration 009, with filtering in LedgerPage.

**Design system complete.** Midnight Sovereign tokens in `tailwind.config.ts`, self-hosted fonts, `.glass-panel` / `.gold-gradient` / `tabular-nums` CSS utilities, no external component library.

**Legal entities:** J. Suijker Beheer B.V. (business) and J. Suijker Privé (personal). Entity separation is legally significant.

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
| Manual valuations in v1 | Ship faster; live feeds add integration complexity without changing core UX | ✓ Good — correct for v1 |
| Excel/CSV import | User's existing data is in Excel; bulk import needed before app is usable | ✓ Good — SheetJS wizard shipped |
| No React Router | Deliberate architectural choice; discriminated union is simpler at this scale | ✓ Good — zero routing complexity |
| Global Net Worth as v1 core | If one thing works perfectly, it's the dashboard — everything else feeds it | ✓ Good — dashboard is the anchor |
| API port 3001 (not 3040) | copilot-instructions spec took precedence over PRD; 3040 was stale | ✓ Good — host ports 4000/4001 to avoid local conflicts |
| EUR currency (not USD) | Real portfolio is in EUR; all display formatting switched to nl-NL locale | ✓ Good — correct for actual use case |
| sub_class + product_type columns | Gold/silver/platinum and bar/coin differentiation needed for filtering | ✓ Good — migration 009 added cleanly |

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
*Last updated: 2026-04-11 — Phase 13 complete (data-foundation: dealers + tier_config DB schema, route stubs, frontend types)*
