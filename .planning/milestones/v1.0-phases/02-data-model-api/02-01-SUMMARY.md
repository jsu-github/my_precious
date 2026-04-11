# Phase 02 — Data Model & API: Plan 01 Summary
## DB Migrations (Wave 1)

### Files Created
- `api/migrations/002_entities.ts` — entities table (id, type, name, description, timestamps)
- `api/migrations/003_asset_locations.ts` — asset_locations (id, name, country_code, custodian_name, map_x_pct/y_pct decimal(5,2), timestamps)
- `api/migrations/004_assets.ts` — assets (entity_id FK cascade, location_id FK SET NULL nullable, name, asset_class, current_value decimal(20,2), security_class, audit_frequency, last_audit_date, description, timestamps)
- `api/migrations/005_acquisitions.ts` — acquisitions (asset_id FK cascade, purchase_date, cost_basis decimal(20,2), quantity decimal(20,6), tax_status, description, timestamps)
- `api/migrations/006_fiscal_tags.ts` — fiscal_tags (asset_id FK cascade, fiscal_year int, fiscal_category, jurisdiction, notes, timestamps)
- `api/migrations/007_transfers.ts` — transfers (from_entity_id FK cascade, to_entity_id FK cascade, amount decimal(20,2), transfer_date, description, timestamps)
- `api/migrations/008_valuation_snapshots.ts` — valuation_snapshots (asset_id FK cascade, value decimal(20,2), snapshotted_at timestamp, created_at — NO updated_at, immutable)

### Key Decisions
- All monetary columns: `decimal(20, 2)` → NUMERIC(20,2) in Postgres. NEVER float/double.
- `valuation_snapshots` is immutable — no `updated_at` column.
- FK constraint patterns: entities delete cascades to assets → acquisitions/fiscal_tags/snapshots. Asset locations use SET NULL so deleting a location doesn't cascade.
- All migrations use `createTableIfNotExists` / `dropTableIfExists` per project convention.

### Verification
- Migrations ran automatically on `docker compose restart api`
- Log: `[db] Migrations complete` confirmed
- All 7 tables created in `precious` database
