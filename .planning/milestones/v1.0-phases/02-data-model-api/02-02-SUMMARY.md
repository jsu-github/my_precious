# Phase 02 — Data Model & API: Plan 02 Summary
## TypeScript Types (Wave 1)

### Files Modified
- `frontend/src/types.ts` — full replacement with all entity interfaces

### Interfaces Exported
- `ApiError` — `{ error: { message: string; status: number } }`
- `Entity` — id, type (EntityType), name, description, timestamps
- `AssetLocation` — id, name, country_code, custodian_name, map_x_pct/y_pct (number), timestamps
- `Asset` — full entity with optional joined fields (entity_name, entity_type, location_name, custodian_name, acquisitions[])
- `Acquisition` — id, asset_id, purchase_date, cost_basis (string), quantity (string), tax_status, description, timestamps
- `FiscalTag` — id, asset_id, fiscal_year, fiscal_category, jurisdiction, notes, timestamps
- `Transfer` — id, from/to_entity_id, amount (string), transfer_date, description, timestamps + joined entity names
- `ValuationSnapshot` — id, asset_id, value (string), snapshotted_at, created_at (no updated_at)
- `DashboardSummary` — total_value, entity_id, asset_count, by_asset_class[]

### String Union Types (Enums)
- `AssetClass`: precious_metals | real_estate | equities | crypto | private_equity | fixed_income | cash | exotics
- `EntityType`: personal | business
- `TaxStatus`: settled | pending
- `SecurityClass`: high_security | medium_security | standard
- `AuditFrequency`: annual | semi_annual | quarterly

### Input Types
- All use `Omit<>` / `Partial<>` patterns — no field duplication
- CreateX = Omit<X, 'id' | timestamp fields | joined fields>
- UpdateX = Partial<CreateX>

### Key Decisions
- NUMERIC columns (`current_value`, `cost_basis`, `quantity`, `amount`, `value`) typed as `string` — pg driver returns these as strings to preserve precision. Frontend must use `parseFloat()` / `Number()` for arithmetic.
- `Asset` has optional joined fields declared at type level — safe to access with `?.` operator.
