# Phase 02: Data Model & API — Context

**Gathered:** April 10, 2026
**Status:** Ready for planning
**Mode:** Auto-generated (yolo mode — discuss skipped)

<domain>
## Phase Boundary

Build all PostgreSQL tables, full CRUD REST endpoints, TypeScript types, and `api.ts` helper methods needed by Phases 3–12 screen development.

**Goal**: All six data entities persisted in PostgreSQL with full CRUD REST endpoints — TypeScript types and `api.ts` helper methods ready for frontend screen development.

**In scope:**
- 7 database tables: `entities`, `assets`, `asset_locations`, `acquisitions`, `fiscal_tags`, `transfers`, `valuation_snapshots`
- All CRUD endpoints under `/api/`
- TypeScript interfaces in `frontend/src/types.ts`
- Typed API helpers in `frontend/src/api.ts`
- Seed data for all entities

**Out of scope:**
- Frontend UI (Phase 3+)
- Excel import (Phase 11)
- Valuation snapshot triggering logic (Phase 10 writes; schema only now)

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions (from PROJECT.md + STATE.md)
- D-01: ALL monetary columns: `table.decimal('col', 20, 2)` → NUMERIC(20,2). Never float/double.
- D-02: Asset classes enum: `precious_metals | real_estate | equities | crypto | private_equity | fixed_income | cash | exotics`
- D-03: API error shape: `{ error: { message: string, status: number } }` — matches errorHandler
- D-04: Nested routes mounted on parent router: `POST /api/assets/:id/acquisitions`
- D-05: Entity types: `personal | business`
- D-06: Seed data must be realistic — drives all screen development in Phases 4–9

### Agent's Discretion
- Table naming: snake_case
- Timestamp columns: `created_at`, `updated_at` via Knex timestamps()
- IDs: integer autoincrement (not UUID — simpler for v1)
- Soft deletes: not needed (hard delete is fine)
- Tax status enum: `settled | pending`
- Security class enum: `high_security | medium_security | standard`
- Audit frequency: `annual | semi_annual | quarterly`

</decisions>

<code_context>
## Existing Code

- `api/src/db.ts`: Knex singleton, `runMigrations()` — already wired
- `api/src/routes/index.ts`: Empty router — ready for entity routers to be mounted
- `api/src/index.ts`: `app.use('/api', routes)` + errorHandler last
- `api/migrations/001_initial.ts`: Empty placeholder — Phase 2 adds 002+ migrations
- `frontend/src/types.ts`: Only `ApiError` — Phase 2 adds all entity types
- `frontend/src/api.ts`: `request<T>()` helper + empty api object — Phase 2 adds namespaces

</code_context>

<specifics>
## Schema Details (from screens + requirements)

### entities
- id, type (personal|business), name, description, created_at, updated_at

### assets
- id, entity_id (FK→entities), name, asset_class (enum), current_value NUMERIC(20,2), location_id (FK→asset_locations nullable), security_class, audit_frequency, last_audit_date, description, created_at, updated_at

### asset_locations
- id, name, country_code, custodian_name, map_x_pct NUMERIC(5,2), map_y_pct NUMERIC(5,2), created_at, updated_at

### acquisitions
- id, asset_id (FK→assets), purchase_date, cost_basis NUMERIC(20,2), quantity NUMERIC(20,6), tax_status (settled|pending), description, created_at, updated_at

### fiscal_tags
- id, asset_id (FK→assets), fiscal_year integer, fiscal_category, jurisdiction, notes, created_at, updated_at

### transfers
- id, from_entity_id (FK→entities), to_entity_id (FK→entities), amount NUMERIC(20,2), transfer_date, description, created_at, updated_at

### valuation_snapshots
- id, asset_id (FK→assets), value NUMERIC(20,2), snapshotted_at timestamp, created_at

## Seed Data
Two entities: "Personal Principal" (personal) + "Sovereign-LLC" (business)
~8 assets spanning all 8 classes, across 3-4 locations, with acquisitions + fiscal_tags

</specifics>

<deferred>
## Deferred Ideas

- Valuation snapshot auto-trigger on update (Phase 10)
- Pagination on list endpoints (v2)
- Search/filter at API level (handled in frontend)

</deferred>
