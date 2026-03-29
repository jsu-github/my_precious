# Roadmap: Precious Dashboard

**Milestone:** v1 — Sovereign Risk Management MVP
**Granularity:** Standard
**Phases:** 6
**Created:** 2026-03-29

## Phase Overview

| # | Phase | Goal | Requirements | Plans |
|---|-------|------|--------------|-------|
| 1 | Infrastructure & Project Foundation | Full project stack runs end-to-end via a single `docker compose up` | INFRA-01, INFRA-02, INFRA-03, INFRA-04 | 5 |
| 2 | Asset Management | Users can add, view, edit, and delete any asset type with its current value | ASSET-01, ASSET-02, ASSET-03, ASSET-04, ASSET-05 | 5 |
| 3 | Risk Dimensions & Scoring | Every asset can be scored against every risk dimension with gross and net scores stored separately | DIM-01, DIM-02, DIM-03, DIM-04, RISK-01, RISK-02, RISK-03, RISK-04 | 5 |
| 4 | Mitigations & Tags | Users can document concrete mitigation actions and group assets with cross-cutting tags | MIT-01, MIT-02, MIT-03, MIT-04, TAG-01, TAG-02, TAG-03 | 5 |
| 5 | Portfolio Dashboard | Dashboard presents a capital-weighted risk overview with heatmap visualization that updates in real time | PORT-01, PORT-02, PORT-03, PORT-04 | 5 |
| 6 | Concentration Warnings | System automatically detects and prominently alerts when capital is dangerously concentrated under a single tag | WARN-01, WARN-02, WARN-03 | 4 |

## Phases

### Phase 1: Infrastructure & Project Foundation
**Goal:** The complete project stack — PostgreSQL, REST API, and React PWA — runs end-to-end from a single `docker compose up` with no manual steps.
**Depends on:** Nothing
**Requirements:** INFRA-01, INFRA-02, INFRA-03, INFRA-04

**Plans:**
1. Docker Compose stack — Define services for PostgreSQL, Node.js/Express API, and React frontend with networking, named volumes, and environment variable wiring
2. Database migration system — Set up a migration runner (e.g. Knex or db-migrate); define initial schema versioning; migrations run automatically at API startup
3. REST API skeleton — Express application with health endpoint, CORS, JSON parsing, error-handling middleware, and a clean route structure ready for feature endpoints
4. React PWA scaffold — Vite + React + TypeScript project with web app manifest, service worker registration, and installable PWA shell verified in Chrome DevTools
5. Development workflow — Hot reload for frontend and API in dev mode; production multi-stage Dockerfiles; confirm fresh-clone-to-running-app in one command

**Success Criteria:**
1. `docker compose up` starts all three containers (PostgreSQL, API, frontend) without errors from a clean checkout
2. `GET /health` on the API returns 200 with a JSON status response visible from the browser
3. Frontend is accessible at `localhost` and the browser prompts PWA install (passes Lighthouse PWA installability checks)
4. Database migrations run automatically on API startup and produce a fully reproducible schema — no manual SQL required
5. A developer on a fresh machine can clone the repo, run `docker compose up`, and reach the running app with no additional steps

---

### Phase 2: Asset Management
**Goal:** Users can add, view, edit, and delete any type of asset — physical gold, crypto, real estate, stocks — using the same uniform data model, with capital weight automatically calculated.
**Depends on:** Phase 1
**Requirements:** ASSET-01, ASSET-02, ASSET-03, ASSET-04, ASSET-05

**Plans:**
1. Asset database migration — Schema for `assets` table: id, name, description, type_label, value, currency, created_at, updated_at; no category-specific columns
2. Asset REST API — Full CRUD: `POST /assets`, `GET /assets`, `GET /assets/:id`, `PUT /assets/:id`, `DELETE /assets/:id`; DELETE cascades to all child records
3. Asset list view — React page showing all assets with name, type label, current value, capital weight (% of total portfolio), and a placeholder net risk score
4. Asset add/edit form — Shared form component for creating and editing assets; field validation; currency/unit is a free-text label, not a dropdown
5. Asset deletion flow — Confirmation dialog before deletion; cascade removes all associated risk scores, mitigations, and tags

**Success Criteria:**
1. User can add an asset with name, description, type label, and current value; it immediately appears in the asset list
2. User can edit any field of an existing asset and the updated values are reflected immediately without a page reload
3. User can delete an asset and it disappears from the list along with all its associated risk scores, mitigations, and tags
4. Asset list displays capital weight (percentage of total portfolio value) for each asset, recalculated live as values change
5. Gold, crypto, real estate, and stocks all use exactly the same add/edit form — no special fields or category branches

---

### Phase 3: Risk Dimensions & Scoring
**Goal:** Every asset is scored against every risk dimension on a 5-point scale, with gross and net risk scores stored independently and displayed side-by-side in the asset detail view.
**Depends on:** Phase 2
**Requirements:** DIM-01, DIM-02, DIM-03, DIM-04, RISK-01, RISK-02, RISK-03, RISK-04

**Plans:**
1. Dimensions schema & seed — Migration for `risk_dimensions` table; seed 3 non-deletable defaults (Counterparty, Liquidity, Geography); DB constraint prevents deleting default rows
2. Dimension management API — CRUD endpoints for custom dimensions (`POST /dimensions`, `GET /dimensions`, `PUT /dimensions/:id`, `DELETE /dimensions/:id`); enforce no-delete on defaults
3. Risk scores schema & API — Migration for `risk_scores` table (asset_id, dimension_id, gross_score, net_score, 5-point enum); `PUT /assets/:id/scores/:dimensionId` to update
4. Dimension management UI — Settings page for adding custom dimensions, renaming dimensions, and deleting custom ones; defaults shown as locked
5. Asset detail scoring interface — Single-page scoring view for an asset listing all dimensions in a table; gross and net score selectors per row; both always visible simultaneously

**Success Criteria:**
1. The three default dimensions (Counterparty, Liquidity, Geography) are present on every asset's scoring view without any user action
2. User can add a custom dimension (e.g., "Climate Risk") and it immediately appears in the scoring interface for all existing assets
3. User can set a 5-point gross risk score (Extra Low → Critical) for any asset-dimension pair and the value persists across sessions
4. User can set a net residual risk score independently — it can differ from the gross score and is stored separately
5. Gross and net scores are displayed side-by-side at all times in the asset detail view; the default three dimensions cannot be deleted

---

### Phase 4: Mitigations & Tags
**Goal:** Users can document the concrete actions that reduce each dimension's risk per asset, and apply portfolio-wide tags to group assets for cross-cutting concentration analysis.
**Depends on:** Phase 3
**Requirements:** MIT-01, MIT-02, MIT-03, MIT-04, TAG-01, TAG-02, TAG-03

**Plans:**
1. Mitigations schema & API — Migration for `mitigations` table (id, asset_id, dimension_id, description, created_at); full CRUD: `POST`, `GET`, `PUT /:id`, `DELETE /:id`
2. Mitigation UI — Inline interface within the asset-dimension scoring row: list existing mitigations with edit/delete controls; inline text input to add new ones
3. Tags schema & API — Migration for `tags` table and `asset_tags` join table; CRUD for tags (`POST /tags`, `GET /tags`, `DELETE /tags/:id`) and assignment (`POST /assets/:id/tags`, `DELETE /assets/:id/tags/:tagId`)
4. Tag management & asset assignment UI — Global tags manager page (create/delete tags); tag assignment control on asset detail view showing all tags with checkbox or multi-select
5. Tag overview page — Page listing all portfolio tags, each expanded to show its assets with individual and combined capital exposure (total value + % of portfolio)

**Success Criteria:**
1. User can add one or more mitigation descriptions per asset-dimension pair; each mitigation is saved individually and persists across sessions
2. User can edit the text of an existing mitigation and delete it inline without leaving the asset detail view
3. User can create a new portfolio-wide tag (e.g., "EU jurisdiction") and assign multiple tags to a single asset
4. Tag overview page shows, for each tag, the list of assets sharing it and their combined capital exposure in both absolute value and percentage of total portfolio
5. Mitigations are displayed inline alongside the gross/net risk scores they inform, making the mitigation-to-risk relationship visually direct

---

### Phase 5: Portfolio Dashboard
**Goal:** The dashboard presents a single capital-weighted portfolio risk score, a risk heatmap across dimensions, and a gross-vs-net breakdown — all updating instantly when any asset data changes.
**Depends on:** Phase 4
**Requirements:** PORT-01, PORT-02, PORT-03, PORT-04

**Plans:**
1. Portfolio scoring API — Endpoint computing capital-weighted total risk score, per-dimension capital-weighted aggregates, and gross/net contribution breakdown across the portfolio
2. Dashboard page layout — React page with a summary metrics strip (total value, weighted risk score) and two-column section grid for visual components
3. Capital-weighted score component — Prominent headline metric showing the portfolio risk score with a brief visual indicator (color band or gauge); hover tooltip explains weighting
4. Risk heatmap component — Spider chart or heat matrix showing capital-weighted risk concentration per dimension; cells/segments turn red at Critical, amber at High
5. Gross vs net breakdown component — Side-by-side bar or table showing gross risk contribution vs net risk contribution across the full portfolio, making the aggregate mitigation effect visible

**Success Criteria:**
1. Dashboard displays a single capital-weighted portfolio risk score computed from the net residual scores of all assets, weighted by their capital value
2. Risk heatmap visualizes all active dimensions with visual intensity proportional to capital-weighted concentration; dimensions with Critical concentration are highlighted in red
3. Gross and net risk contributions are displayed side-by-side for the full portfolio, showing the aggregate impact of mitigations
4. Any change to an asset's value, score, or mitigation immediately updates all dashboard values and visualizations within the same session without a full page reload
5. A €500k asset demonstrably has proportionally greater influence on the portfolio risk score than a €500 asset in the same risk band

**UI hint**: yes

---

### Phase 6: Concentration Warnings
**Goal:** The system automatically computes tag-based capital concentration and surfaces prominent warnings on the dashboard when any single tag accounts for ≥70% of total portfolio value.
**Depends on:** Phase 5
**Requirements:** WARN-01, WARN-02, WARN-03

**Plans:**
1. Concentration detection logic — API function computing, for each tag, the percentage of total portfolio value held by assets bearing that tag; returns warnings for tags exceeding the threshold
2. Warning API endpoint — `GET /warnings/concentration` returning active warnings with tag name, percentage, contributing asset list; threshold configurable via API
3. Dashboard warning component — Prominent alert banner or card on the dashboard for each active warning; uses strong visual hierarchy (red/amber) to demand attention
4. Threshold configuration UI — Settings control to adjust the warning threshold percentage (default 70%); change persists to database or config
5. Reactive warning refresh — Warnings recompute and re-render whenever asset values or tag assignments change, without requiring a page reload

**Success Criteria:**
1. When ≥70% of total portfolio value is held in assets sharing a single tag, the system generates and displays a warning automatically
2. Concentration warnings appear as prominent, visually distinct alerts on the main dashboard — not buried in a settings page
3. Each warning contains: the tag name, the exact percentage of capital concentrated, and the list of contributing assets with their individual values
4. User can change the warning threshold (e.g., from 70% to 50%) and the warning evaluation immediately applies the new threshold

---

## Requirement Traceability

| Requirement | Phase | Phase Name |
|-------------|-------|------------|
| ASSET-01 | 2 | Asset Management |
| ASSET-02 | 2 | Asset Management |
| ASSET-03 | 2 | Asset Management |
| ASSET-04 | 2 | Asset Management |
| ASSET-05 | 2 | Asset Management |
| DIM-01 | 3 | Risk Dimensions & Scoring |
| DIM-02 | 3 | Risk Dimensions & Scoring |
| DIM-03 | 3 | Risk Dimensions & Scoring |
| DIM-04 | 3 | Risk Dimensions & Scoring |
| RISK-01 | 3 | Risk Dimensions & Scoring |
| RISK-02 | 3 | Risk Dimensions & Scoring |
| RISK-03 | 3 | Risk Dimensions & Scoring |
| RISK-04 | 3 | Risk Dimensions & Scoring |
| MIT-01 | 4 | Mitigations & Tags |
| MIT-02 | 4 | Mitigations & Tags |
| MIT-03 | 4 | Mitigations & Tags |
| MIT-04 | 4 | Mitigations & Tags |
| TAG-01 | 4 | Mitigations & Tags |
| TAG-02 | 4 | Mitigations & Tags |
| TAG-03 | 4 | Mitigations & Tags |
| PORT-01 | 5 | Portfolio Dashboard |
| PORT-02 | 5 | Portfolio Dashboard |
| PORT-03 | 5 | Portfolio Dashboard |
| PORT-04 | 5 | Portfolio Dashboard |
| WARN-01 | 6 | Concentration Warnings |
| WARN-02 | 6 | Concentration Warnings |
| WARN-03 | 6 | Concentration Warnings |
| INFRA-01 | 1 | Infrastructure & Project Foundation |
| INFRA-02 | 1 | Infrastructure & Project Foundation |
| INFRA-03 | 1 | Infrastructure & Project Foundation |
| INFRA-04 | 1 | Infrastructure & Project Foundation |

**Coverage:** 31/31 v1 requirements mapped ✓

---
*Roadmap created: 2026-03-29*
*Last updated: 2026-03-29 after initialization*
