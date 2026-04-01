# Phase 2: Asset Management — Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers complete CRUD for assets — the core data entity of the app. After this phase, a user can create, read, update, and delete any type of asset (gold coin, PAXG token, apartment, Apple stock — all identical in the data model), see all assets in a list with live capital weight, and safely delete an asset with full cascade cleanup.

**What's in scope:**
- `assets` table migration (no category columns)
- Full CRUD REST API (`/assets`)
- Asset list view with capital weight
- Add/edit form (shared, no category branching)
- Deletion with confirmation + cascade

**Out of scope this phase:** Risk scoring UI/API, mitigations, tags, dashboard aggregations — those come in Phases 3–6.

</domain>

<decisions>
## Implementation Decisions

### Data Model (ASSET-05)
- Single `assets` table — `id` (UUID), `name`, `description`, `type_label` (free text), `value` (numeric), `currency` (free text), `created_at`, `updated_at`
- NO category-specific columns — gold and real estate are stored identically
- `type_label` is a free-text string (e.g. "Physical Gold", "Crypto", "Real Estate")
- `currency` is also free text (e.g. "EUR", "USD", "OZ") — no enum constraint

### API (ASSET-01, 02, 03)
- `POST /api/assets` — create
- `GET /api/assets` — list all (includes computed `capital_weight_pct`)
- `GET /api/assets/:id` — single asset
- `PUT /api/assets/:id` — full update
- `DELETE /api/assets/:id` — cascades child records
- `GET /api/assets` response includes `capital_weight_pct` computed server-side from total portfolio value
- API routes mounted at `/api/assets` (not `/assets`) to avoid conflicts with frontend static routes

### Frontend (ASSET-04)
- Single `AssetsPage` component — hosts list + inline form
- Asset list shows: name, type_label, value (with currency), capital_weight_pct, placeholder for net risk score (rendered as "—" until Phase 3)
- Form is shared for create and edit — same component, same fields
- `currency` field is a free-text `<input>`, NOT a `<select>` (no dropdown enum)
- Immediate optimistic UI — list updates without full page reload after add/edit/delete

### Deletion (ASSET-03)
- Confirmation dialog/modal before deletion commits
- Backend DELETE cascades via DB foreign keys (set up in Phase 3's migration for risk_scores; Phase 2 only has `assets` table so cascade is trivially complete for now)
- Frontend removes asset from list state immediately on DELETE 200

### Tech conventions
- Frontend fetches via a typed `api.ts` module (wraps fetch, uses `VITE_API_URL` env)
- State management: React `useState` + `useEffect` — no external state library in v1
- Frontend serves under `/` — API proxy at `/api` prefix in Vite dev config (already wired in Phase 1)

### the agent's Discretion
- Exact Tailwind/CSS class choices and visual polish
- Loading/error state UX patterns
- Input validation messages wording
- Whether to use a modal or inline form for add/edit (either is fine — must be same component for both actions)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 Foundation (read before writing any new files)
- `.planning/phases/01-infrastructure-project-foundation/01-02-SUMMARY.md` — DB singleton (`api/src/db.ts`), Knex config, migration pattern
- `.planning/phases/01-infrastructure-project-foundation/01-03-SUMMARY.md` — Express app structure, route mounting pattern at `api/src/routes/`
- `.planning/phases/01-infrastructure-project-foundation/01-04-SUMMARY.md` — Frontend structure, `VITE_API_URL` env usage

### Project Context
- `.planning/PROJECT.md` — Core value, key decisions
- `.planning/REQUIREMENTS.md` — ASSET-01 through ASSET-05 full text
- `.planning/ROADMAP.md` — Phase 2 success criteria

</canonical_refs>

<specifics>
## Specific Ideas

From the project vision document:
- Assets named like "5x Gouden Krugerrand 1oz" or "10 PAXG" — name is a free-text label, no parsing
- `value` should support decimal precision for crypto quantities (use `DECIMAL(18,8)` in PostgreSQL)
- Capital weight is computed: `(asset.value / SUM(all assets.value)) * 100` — must handle division-by-zero when portfolio is empty (return 0)

</specifics>

<deferred>
## Deferred

- Risk score column on asset list → Phase 3 (shown as placeholder "—" now)
- Cascade cleanup of risk_scores/mitigations → will be enforced by FK constraints in Phase 3's migration
- Bulk import / CSV upload → out of scope v1
- Asset price history / value tracking over time → out of scope v1

</deferred>

---

*Phase: 02-asset-management*
*Context gathered: 2026-04-01*
