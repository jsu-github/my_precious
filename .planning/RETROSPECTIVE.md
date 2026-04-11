# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-10
**Phases:** 12 | **Plans:** 14 (GSD-tracked) + 8 (direct commits) | **Timeline:** 12 days (2026-03-29 → 2026-04-10)
**Git commits:** 12 | **Files changed:** 70 | **LOC:** ~4,400 TypeScript

### What Was Built

- Full Docker Compose local stack — `make dev` starts frontend (4000), API (4001), PostgreSQL in one command
- Complete data model — 9 PostgreSQL migrations covering entities, assets, acquisitions, vault locations, fiscal tags, transfers, valuation snapshots
- Midnight Sovereign design system — dark-first, gold/emerald/navy, Newsreader headlines, no component library, `.glass-panel` + `tabular-nums` CSS utilities
- Six dashboard screens: Net Worth, Transaction Ledger, Performance Analytics, Asset Locations world map, Tax & Compliance, Business vs. Personal
- In-app CRUD modals for entities, assets, and acquisitions
- Excel/CSV 4-step import wizard with SheetJS column mapping and atomic rollback
- PWA manifest + service worker — installable, 5-min API cache for offline resilience
- Real portfolio data loaded: 20 assets, 31 acquisitions for Beheer B.V. + Privé across gold/silver/platinum

### What Worked

- **Design-first clarity** — having `.stitch/` mockups and `midnight-sovereign.json` tokens before coding meant zero design decisions at implementation time
- **GSD phase discipline for phases 1–4** — proper plan/summary artifacts made the foundation solid and easy to reference back
- **TypeScript end-to-end** — shared `types.ts` and `api.ts` helper eliminated an entire class of frontend/backend drift bugs
- **Docker-only runtime** — no local Node/Postgres setup friction; `make dev` just works
- **Direct SQL for real data** — loading actual portfolio via `psql` was faster and more reliable than going through the import wizard for initial seeding

### What Was Inefficient

- **Phases 5–12 shipped without GSD tracking artifacts** — implemented in large consolidated commits (`feat(06-09)`) rather than per-phase plans/summaries; this made the retrospective harder and lost granular execution history
- **Phase 10 (CRUD)** shows as incomplete in the original ROADMAP (`[ ]`) despite being shipped — the checkbox was never updated
- **REQUIREMENTS.md traceability** never checked off during development — requirements existed but weren't used as a progress signal
- **Port collision** was discovered at integration time, not planned for — PRD said 3001/3000,  another local project already occupied those ports (needed 4001/4000)
- **Currency assumption** — USD was the initial default; switching to EUR required a retroactive pass across 6 pages and 2 modals after real data was loaded

### Patterns Established

- API endpoints: all prefixed `/api/`, nested sub-resources on parent router (e.g. `POST /api/assets/:id/acquisitions`)
- Money storage: `NUMERIC(20,2)` enforced from migration 001 — never float
- Navigation: discriminated union `View` in `App.tsx` — no React Router; `onNavigateTo*` callbacks as props
- Currency display: `Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })` everywhere
- Sub-class filtering: `sub_class` and `product_type` columns on assets, context-aware filter dropdowns in LedgerPage
- Error shape: `{ error: { message: string, status: number } }` from all API endpoints

### Key Lessons

1. **Plan port mappings before coding** — check for port conflicts at project init, not discovery during Docker wiring
2. **Define currency locale upfront** — don't assume USD; changing globally later is tedious and error-prone
3. **Use GSD phase tracking for all phases, even fast ones** — phases 5–12 being "done fast" without artifacts created gaps that required manual archaeology at milestone close
4. **Requirements as live progress signals** — checking off REQUIREMENTS.md during builds keeps the traceability table useful; left until end it becomes a chore
5. **Real data loading validates the design** — loading actual precious metals data immediately exposed EUR/USD mismatch and the need for sub_class/product_type columns; doing this early would have saved a retroactive migration

### Cost Observations

- Sessions: ~3–4 focused sessions
- Notable: phases 6–9 built in a single session via consolidated commit — fast but sacrifices per-phase traceability

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 | 12 | Initial build — mixed GSD-tracked and direct-commit phases |

### Cumulative Quality

| Milestone | Tests | Coverage | Notes |
|-----------|-------|----------|-------|
| v1.0 | 0 | 0% | No test suite — v1 was rapid prototyping; v1.1 should add API integration tests |
