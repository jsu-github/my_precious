# Phase 02 — Data Model & API: Plan 04 Summary
## Assets Route — Complex (Wave 2)

### Files Created
- `api/src/routes/assets.ts` — full asset CRUD + 3 nested sub-resource groups

### Route Structure
```
GET    /api/assets?entity_id=N        → Array<Asset> with joined entity + location names
GET    /api/assets/:id                → Asset with acquisitions[] joined
POST   /api/assets                    → 201 Asset
PUT    /api/assets/:id                → Asset
DELETE /api/assets/:id                → 204 (CASCADE removes acquisitions, fisctags, snapshots)

GET    /api/assets/:assetId/acquisitions         → Acquisition[]
POST   /api/assets/:assetId/acquisitions         → 201 Acquisition
PUT    /api/assets/:assetId/acquisitions/:id     → Acquisition
DELETE /api/assets/:assetId/acquisitions/:id     → 204

GET    /api/assets/:assetId/fiscal-tags          → FiscalTag[]
POST   /api/assets/:assetId/fiscal-tags          → 201 FiscalTag
PUT    /api/assets/:assetId/fiscal-tags/:id      → FiscalTag
DELETE /api/assets/:assetId/fiscal-tags/:id      → 204

GET    /api/assets/:assetId/valuation-snapshots  → ValuationSnapshot[]
POST   /api/assets/:assetId/valuation-snapshots  → 201 ValuationSnapshot (only value required)
```

### Key Implementation Details
- `GET /api/assets` does LEFT JOIN entities + asset_locations for full context metadata
- `GET /api/assets/:id` also fetches `.acquisitions` as second query and attaches to response
- Sub-resource mutations always scope by both `:assetId` AND `:id` to prevent cross-asset access
- DELETE /api/assets/:id replies 204 — DB CASCADE handles sub-records automatically

### Verification
- `GET /api/assets` returns 8 assets ordered by current_value desc
- Entity name, entity type, location name, custodian name all present in each asset record
