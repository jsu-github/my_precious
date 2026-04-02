---
phase: 03-risk-dimensions-scoring
created: 2026-04-02
requirements: DIM-01, DIM-02, DIM-03, DIM-04, RISK-01, RISK-02, RISK-03, RISK-04
---

# Phase 3 Context: Risk Dimensions & Scoring

## Goal
Every asset can be scored against every risk dimension. Each asset-dimension pair stores two independent scores (gross and net). A dedicated asset detail view shows all dimensions in a single scoring interface.

## Data Model

### risk_dimensions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | uuid_generate_v4() |
| name | VARCHAR(100) | Required |
| description | TEXT | Nullable — optional context |
| is_default | BOOLEAN | true for Counterparty, Liquidity, Geography |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Seeded defaults (is_default=true, cannot be deleted):
- **Counterparty** — Risk from depending on another party (exchange, custodian, issuer)
- **Liquidity** — Risk of not being able to sell/access the asset quickly
- **Geography** — Political, legal, regulatory risk tied to the asset's location

### risk_scores
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| asset_id | UUID FK | → assets.id ON DELETE CASCADE |
| dimension_id | UUID FK | → risk_dimensions.id ON DELETE CASCADE |
| gross_score | SMALLINT | 1–5, nullable (null = not yet scored) |
| net_score | SMALLINT | 1–5, nullable (independent of gross) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

UNIQUE constraint on (asset_id, dimension_id) — one row per pair, upserted.

## Score Scale
| Value | Label |
|-------|-------|
| null | — (not scored) |
| 1 | Extra Low |
| 2 | Low |
| 3 | Medium |
| 4 | High |
| 5 | Critical |

Score colors (dark theme): Extra Low=#22c55e, Low=#84cc16, Medium=#eab308, High=#f97316, Critical=#ef4444

## API Design

### Dimensions
- `GET /api/dimensions` — list all, ordered by is_default desc, name asc
- `POST /api/dimensions` — create custom (is_default always false)
- `PUT /api/dimensions/:id` — rename (all dimensions can be renamed, even defaults)
- `DELETE /api/dimensions/:id` — returns 400 if is_default=true

### Scores (nested under assets, mounted via mergeParams)
- `GET /api/assets/:id/scores` — LEFT JOIN of all dimensions + scores for this asset
- `PUT /api/assets/:id/scores/:dimensionId` — upsert { gross_score, net_score }

Scores router uses `Router({ mergeParams: true })` mounted in assets.ts as:
`assetsRouter.use('/:id/scores', scoresRouter)`

## Frontend Navigation
State-based routing in App.tsx — no react-router needed for v1.

```typescript
type View =
  | { page: 'portfolio' }
  | { page: 'dimensions' }
  | { page: 'asset-detail'; assetId: string };
```

**Plan 03-04** introduces the View type and DimensionsPage route. App.tsx passes `onNavigateToDimensions` to AssetsPage.
**Plan 03-05** extends View with asset-detail. App.tsx passes `onNavigateToAsset` to AssetsPage. Asset names become clickable.

## Scoring UI
Button group per score type — 5 buttons per row (Extra Low → Critical).
- Selected button: colored background
- Unselected: dark slate (#1e293b)
- Clicking selected button again → clears to null (toggle)
- Auto-save on click — calls PUT API immediately, shows brief "Saving…" per row

## Key Constraints
- Default dimensions (is_default=true) cannot be deleted (API and UI both enforce)
- All dimensions apply to every asset (always fetched by GET /api/assets/:id/scores via LEFT JOIN)
- Scores are null until explicitly set — the JOIN returns null for any unscored pair
- The "—" placeholder in AssetsPage (net risk column) stays until Phase 5
