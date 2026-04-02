# Summary: 05-01 — Portfolio Scoring API + Frontend Types

**Phase:** 05-portfolio-dashboard
**Plan:** 01
**Status:** Complete
**Completed:** 2026-04-02

## What Was Built

- `api/src/routes/portfolio.ts` — `GET /api/portfolio/summary` endpoint: capital-weighted SQL aggregation using `SUM(value × score) / SUM(value)` per dimension; overall gross and net across all dimension pairs; rounds to 2 decimal places
- `api/src/index.ts` — mounted `portfolioRouter` at `/api/portfolio`
- `frontend/src/types.ts` — added `DimensionSummary` and `PortfolioSummary` interfaces
- `frontend/src/api.ts` — added `api.portfolio.summary()` method calling `GET /api/portfolio/summary`

## Key Decisions

- Route path is `/api/portfolio/summary` (not `/api/portfolio`) — matches frontend API client
- Assets with null scores are excluded from both numerator and denominator of weighted average (not treated as zero)
- `NULLIF(..., 0)` prevents division-by-zero when no assets are scored

## Verification

- `curl http://localhost:3011/api/portfolio/summary` → 200 JSON with `total_value`, `asset_count`, `weighted_gross`, `weighted_net`, `by_dimension` (3 default dimensions)
- TypeScript types confirmed exported from `frontend/src/types.ts`

## Artifacts

| File | Action |
|------|--------|
| `api/src/routes/portfolio.ts` | Created |
| `api/src/index.ts` | Updated (portfolioRouter mount) |
| `frontend/src/types.ts` | Updated (DimensionSummary, PortfolioSummary) |
| `frontend/src/api.ts` | Updated (portfolio.summary(), PortfolioSummary import) |

## Commits

- `75b9c28` feat(05-01): portfolio scoring API (GET /api/portfolio/summary)
- `d9435eb` feat(05-01): PortfolioSummary types and api.portfolio.summary() client
