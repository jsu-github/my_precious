# Phase 4 Context: Mitigations & Tags

## Goal
Users can document concrete mitigation actions per asset-dimension pair, and apply portfolio-wide tags to group assets for cross-cutting concentration analysis.

## Requirements
- MIT-01: User can add one or more mitigation descriptions per asset-dimension pair
- MIT-02: Mitigations persist and are displayed inline alongside the risk scores they inform
- MIT-03: User can edit or delete an existing mitigation inline without leaving the asset detail view
- MIT-04: Mitigations are visually co-located with the gross/net scores they explain
- TAG-01: User can create and delete portfolio-wide tags
- TAG-02: Multiple tags can be assigned to a single asset
- TAG-03: Tag overview page shows per-tag capital exposure in absolute value and % of portfolio

## Data Model

### `mitigations` table
```
id          UUID PK DEFAULT uuid_generate_v4()
asset_id    UUID FK → assets(id) ON DELETE CASCADE
dimension_id UUID FK → risk_dimensions(id) ON DELETE CASCADE
description TEXT NOT NULL
created_at  TIMESTAMP NOT NULL DEFAULT now()
updated_at  TIMESTAMP NOT NULL DEFAULT now()
```
- No UNIQUE constraint — multiple mitigations per asset-dimension pair are allowed
- No FK to risk_scores — mitigations belong to the dimension on the asset, not to a score row

### `tags` table
```
id          UUID PK DEFAULT uuid_generate_v4()
name        VARCHAR(100) NOT NULL UNIQUE
created_at  TIMESTAMP NOT NULL DEFAULT now()
```

### `asset_tags` join table
```
asset_id    UUID FK → assets(id) ON DELETE CASCADE
tag_id      UUID FK → tags(id) ON DELETE CASCADE
PRIMARY KEY (asset_id, tag_id)
```
Deleting a tag cascades and removes all asset_tags rows for it.

## API Design

### Mitigations
All mitigations scoped under the asset using mergeParams:
```
GET    /api/assets/:id/mitigations              → list all for asset (optionally ?dimension_id=X)
POST   /api/assets/:id/mitigations              → create { dimension_id, description }
PUT    /api/assets/:id/mitigations/:mitigationId → update { description }
DELETE /api/assets/:id/mitigations/:mitigationId → delete (204)
```
Router: `mitigationsRouter = Router({ mergeParams: true })` mounted in assetsRouter.
GET response shape: `{ id, asset_id, dimension_id, description, created_at, updated_at }`

### Tags
```
GET    /api/tags                            → list all tags
POST   /api/tags                            → create { name }
DELETE /api/tags/:id                        → delete tag + cascade removes asset_tags
GET    /api/tags/overview                   → portfolio overview (tag + assets + combined value/%)
GET    /api/assets/:id/tags                 → tags assigned to asset
POST   /api/assets/:id/tags                 → assign tag { tag_id }
DELETE /api/assets/:id/tags/:tagId          → remove tag assignment
```
Overview endpoint returns:
```json
[{
  "tag_id": "...", "tag_name": "EU jurisdiction",
  "asset_count": 3, "total_value": 150000, "currency": "EUR", "portfolio_pct": 30.5,
  "assets": [{ "id", "name", "value", "currency", "capital_weight_pct" }]
}]
```

### Asset tags router
Mounted inside assetsRouter: `assetsRouter.use('/:id/tags', assetTagsRouter)`
`assetTagsRouter = Router({ mergeParams: true })`

## Frontend Architecture

### New types (types.ts additions)
```typescript
Mitigation { id, asset_id, dimension_id, description, created_at, updated_at }
MitigationCreateInput { dimension_id: string; description: string }
MitigationUpdateInput { description: string }
Tag { id, name, created_at }
TagCreateInput { name: string }
AssetTagEntry { tag_id, tag_name }
TagOverviewItem { tag_id, tag_name, asset_count, total_value, currency, portfolio_pct, assets: TagOverviewAsset[] }
TagOverviewAsset { id, name, value, currency, capital_weight_pct }
```

### New api methods (api.ts additions)
```typescript
api.mitigations.listForAsset(assetId, dimensionId?)
api.mitigations.create(assetId, data)
api.mitigations.update(assetId, mitigationId, data)
api.mitigations.delete(assetId, mitigationId)
api.tags.list()
api.tags.create(data)
api.tags.delete(id)
api.tags.overview()
api.assetTags.list(assetId)
api.assetTags.assign(assetId, tagId)
api.assetTags.remove(assetId, tagId)
```

### New pages
- `TagsPage.tsx` — Global tag manager (create/delete); accessed via header button in AssetsPage
- `TagOverviewPage.tsx` — Per-tag capital exposure; accessed via "Tag Overview" button in AssetsPage header

### Modified pages
- `AssetDetailPage.tsx` — Below each scoring row: inline mitigation list + add input (plan 04-02); + tag assignment section at bottom (plan 04-04)
- `App.tsx` — Extend View type with `| { page: 'tags' } | { page: 'tag-overview' }`
- `AssetsPage.tsx` — Add "Tags" and "Tag Overview" nav buttons alongside existing "⚙ Dimensions"

## Mitigation UI Design (04-02)
- Each scoring row expands to show mitigations below (full-width sub-row spanning all 3 columns)
- Mitigations shown as a compact list: text + Edit + Delete buttons on each
- Inline text input at bottom of each row to add a new mitigation (placeholder: "Add mitigation…")
- Clicking "Add" saves immediately; editing replaces text inline with input
- Loading state: `loadingMitigations` boolean, separate from score saving state
- State: `mitigations: Record<string, Mitigation[]>` keyed by dimension_id

## Tag Assignment UI Design (04-04)
- Bottom section of AssetDetailPage: "Tags" panel with all portfolio tags as toggleable chips
- Each chip: active=filled (colored), inactive=outline — click toggles assignment
- Create new tag inline in this panel
- TagsPage: simple list like DimensionsPage with create + delete (can't delete if has assets? No — cascade is fine, just confirm before deleting)
- TagOverviewPage: accordion list per tag showing assigned assets with their value + portfolio %

## Navigation Map
```
AssetsPage (portfolio)
  → [⚙ Dimensions] → DimensionsPage (back → portfolio)
  → [🏷 Tags] → TagsPage (back → portfolio)
  → [📊 Tag Overview] → TagOverviewPage (back → portfolio)
  → [asset name click] → AssetDetailPage (back → portfolio)
```
