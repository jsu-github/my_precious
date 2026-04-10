# Phase 02 — Data Model & API: Plan 05 Summary
## Wiring + frontend api.ts + Seed Data (Wave 3)

### Files Created/Modified
- `api/src/routes/dashboard.ts` — GET /api/dashboard/summary aggregation
- `api/src/routes/index.ts` — mounts all 5 routers
- `frontend/src/api.ts` — full typed entity namespaces
- `api/src/seed.ts` — realistic seed data for all 7 tables
- `api/package.json` — added `"seed": "ts-node --transpile-only src/seed.ts"` script

### Dashboard Summary Endpoint
```
GET /api/dashboard/summary?entity_id=N (optional)
→ { total_value, asset_count, entity_id, by_asset_class[] }
```
Uses Knex aggregation: `SUM(current_value)` + `COUNT(id)` globally + grouped by `asset_class`.

### Frontend api.ts Namespaces
```typescript
api.entities.{list, get, create, update, delete}
api.locations.{list, get, create, update, delete}
api.assets.{list, get, create, update, delete}
api.assets.acquisitions.{list, create, update, delete}
api.assets.fiscalTags.{list, create, update, delete}
api.assets.snapshots.{list, create}
api.transfers.{list, get, create, delete}
api.dashboard.summary(entityId?)
```

### Seed Data Summary
- 2 entities: Personal Principal (personal), Sovereign LLC (business)
- 4 locations: Zurich Private Vault (CHE), London Custody Account (GBR), Singapore Free Port (SGP), Isle of Man Trust (IMN)
- 8 assets: one per asset_class, total value $15,450,000
- 12 acquisitions: 1-2 per asset, varied dates (2018-2024), mixed tax statuses
- 4 fiscal tags: gold/real-estate/PE/crypto assets
- 2 transfers: LLC→Personal $50k (2024), Personal→LLC $500k (2022)
- 8 valuation snapshots: initial snapshots at seed time

### Verification Results
- `GET /api/assets` → 8 items ✓
- `GET /api/dashboard/summary` → total_value: "15450000.00", 8 by_asset_class entries ✓
- `GET /api/entities` → 2 items ✓
- Seed script: `[seed] Done. Entities: 2, Locations: 4, Assets: 8, Acquisitions: 12, Fiscal tags: 4, Transfers: 2, Snapshots: 8` ✓
