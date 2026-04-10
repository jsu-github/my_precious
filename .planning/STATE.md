# Project State

## Project Reference

See: .planning/PROJECT.md (updated April 9, 2026)

**Core value:** A single Global Net Worth Dashboard showing total financial position across all entities and asset classes — accurate enough to trust, fast enough to open daily
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 5 of 12 (Transaction Ledger) — ready to plan
Plan: 0 of TBD in current phase
Status: Phase 4 complete and verified
Last activity: April 10, 2026 — Phase 4 complete: Dashboard page with net worth hero, asset allocation bars, vault security panel

Progress: [████░░░░░░░░] 33%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **API Port**: Standardized on `:3001` (copilot-instructions is the active spec; PRD value of 3040 is stale)
- **Excel Import**: SheetJS (`xlsx` package) confirmed for Phase 11; column mapping UI required
- **Money precision**: `NUMERIC(20, 2)` enforced for all monetary columns — never `FLOAT` or `DOUBLE`
- **Navigation**: Discriminated union `View` state in `App.tsx` confirmed; no React Router anywhere
- **Glassmorphism boundary**: `.glass-panel` / `backdrop-filter` only on overlay elements (hero cards, modals, header, map tooltips) — never on repeated table rows
- **Tailwind tokens**: All Midnight Sovereign tokens must be extracted from `midnight-sovereign.json` into `tailwind.config.ts` at Phase 3 — CDN-to-bundled drift is the highest-risk pitfall
- **Font strategy**: Self-host Newsreader + Inter in `frontend/public/fonts/` (Phase 12) to eliminate FOUT and Google Fonts CDN dependency
- **Screens-first then CRUD**: Phases 4–9 build read views (seeded data); Phase 10 adds write capability; Phase 11 adds Excel import

### Pending Todos

None yet.

### Blockers/Concerns

- **World map asset**: The `h-[500px]` greyscale world map image referenced in LOC-01 must be sourced before Phase 7. Consider a static SVG or PNG committed to `frontend/public/`.
- **Market ticker data source (ANAL-01)**: Ticker shows XAU, XAG, BTC, S&P 500 — in v1 these are manually-entered spot values (not live feeds). Design must make this clear to avoid user confusion.
- **Valuation snapshots** (DATA-09): Schema must be included in Phase 2 even though performance time-series charts are deferred to v2. Phase 10 triggers snapshot creation on `current_value` update.
- **React re-render on entity toggle** (PITFALLS P6): Memoize page content with `useMemo` / `React.memo` when entity filter state changes — address in Phase 3 App Shell.

## Session Continuity

Last session: 2026-04-09
Stopped at: Roadmap created; no phases planned yet
Resume file: None
