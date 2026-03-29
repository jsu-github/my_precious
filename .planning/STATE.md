# Project State

**Project:** Precious Dashboard
**Milestone:** v1 — Sovereign Risk Management MVP
**Status:** Planning complete — ready for Phase 1

## Current Phase

None — planning complete. Run `/gsd-plan-phase 1` to begin.

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Infrastructure & Project Foundation | Not Started |
| 2 | Asset Management | Not Started |
| 3 | Risk Dimensions & Scoring | Not Started |
| 4 | Mitigations & Tags | Not Started |
| 5 | Portfolio Dashboard | Not Started |
| 6 | Concentration Warnings | Not Started |

## Key Facts

- Stack: React + TypeScript (PWA), Node.js/Express API, PostgreSQL, Docker Compose
- Auth: None (single-user personal tool; backend assumes trusted local environment)
- Pricing: Manual only — no external price feed APIs in v1
- UI Language: English only — no i18n infrastructure
- Platform: PWA — installable from browser, offline-capable shell

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Generic asset model (no category bias) | Gold, crypto, real estate, stocks use same schema — no special-casing |
| 5-point risk scale (Extra Low → Critical) | Granular but not arbitrary; reduces decision fatigue vs 1-10 |
| Gross + net stored separately | Raw exposure (gross) and post-mitigation truth (net) both always visible |
| Capital weighting for portfolio score | Prevents small positions from distorting the overall risk picture |
| Docker Compose, no BaaS | Full data sovereignty; aligns with the app's own risk philosophy |

## Notes

[empty]

---
*Last updated: 2026-03-29 after initialization*
