# Requirements: Precious Dashboard

**Defined:** 2026-03-29
**Core Value:** Every asset must have a quantified gross risk, at least one mitigation action, and a visible net residual risk — making the difference between "I own it" and "I control it" explicit and measurable.

## v1 Requirements

### Asset Management

- [ ] **ASSET-01**: User can add an asset with name, description, type label, and current value (manual entry in any currency/unit)
- [ ] **ASSET-02**: User can edit an existing asset's details and value at any time
- [ ] **ASSET-03**: User can delete an asset and all associated risk scores, mitigations, and tags
- [ ] **ASSET-04**: Asset list displays all assets with current value, capital weight (% of total portfolio), and net risk score
- [ ] **ASSET-05**: Any asset type is stored uniformly — no built-in category bias (gold, crypto, real estate, stocks, stablecoins use the same data model)

### Risk Dimensions

- [ ] **DIM-01**: System includes 3 default dimensions that are always present: Counterparty, Liquidity, Geography
- [ ] **DIM-02**: User can add custom risk dimensions with a name and optional description (e.g., "Climate Risk", "Code Risk")
- [ ] **DIM-03**: User can rename or delete custom dimensions (default dimensions cannot be deleted)
- [ ] **DIM-04**: All risk dimensions apply portfolio-wide — every asset is scored against every dimension

### Risk Scoring

- [ ] **RISK-01**: User can assign a gross risk score per asset per dimension using a 5-point scale: Extra Low / Low / Medium / High / Critical
- [ ] **RISK-02**: User can assign a net residual risk score per asset per dimension independently of the gross score
- [ ] **RISK-03**: Gross score and net score are stored and displayed separately for each asset-dimension pair (both always visible)
- [ ] **RISK-04**: Asset detail view shows all dimensions in a single scoring interface for that asset

### Mitigations

- [ ] **MIT-01**: User can add one or more mitigation actions per asset per risk dimension
- [ ] **MIT-02**: Each mitigation has a free-text description (e.g., "Hardware wallet purchased", "Certified safe bolted to concrete")
- [ ] **MIT-03**: User can edit and delete existing mitigation actions
- [ ] **MIT-04**: Net residual risk score is set by the user after entering mitigations — explicitly acknowledging what risk remains

### Tags & Groupings

- [ ] **TAG-01**: User can create custom portfolio-wide tags (e.g., "Outside banking system", "EU jurisdiction", "Grid-dependent", "Physically tangible")
- [ ] **TAG-02**: User can assign multiple tags to a single asset
- [ ] **TAG-03**: Tag overview shows all assets sharing a tag with their combined capital exposure in value and percentage

### Portfolio Dashboard

- [ ] **PORT-01**: Dashboard shows a capital-weighted total portfolio risk score (assets with higher value have proportionally more influence)
- [ ] **PORT-02**: Risk heatmap visualizes risk concentration across dimensions — spider chart or heat matrix highlighting worst exposures
- [ ] **PORT-03**: Dashboard breakdown shows gross vs net risk contribution across the portfolio side-by-side
- [ ] **PORT-04**: All dashboard values and visualizations update immediately when any asset value, score, or mitigation changes

### Concentration Warnings

- [ ] **WARN-01**: System detects tag-based capital concentration — alerts when ≥70% of total portfolio value shares a single tag (threshold configurable)
- [ ] **WARN-02**: Concentration warnings appear as prominent alerts on the dashboard
- [ ] **WARN-03**: Each warning identifies the tag, the % of capital concentrated, and which assets contribute to it

### Infrastructure

- [ ] **INFRA-01**: Application runs via Docker Compose: PostgreSQL + backend API + frontend as separate containers
- [ ] **INFRA-02**: Database schema managed via migrations — fresh setup is fully reproducible from `docker compose up`
- [ ] **INFRA-03**: Frontend is a PWA — web manifest, service worker, installable from browser without an app store
- [ ] **INFRA-04**: REST API serves as the exclusive data layer between frontend and PostgreSQL (no direct DB access from browser)

## v2 Requirements

Deferred to post-v1. Tracked but not in current roadmap.

### Live Market Data

- **LIVE-01**: Asset current value auto-updated via CoinGecko (crypto/gold) or Yahoo Finance (equities)
- **LIVE-02**: User can toggle between manual and auto-pricing per asset
- **LIVE-03**: Price staleness indicator when auto-price data is older than configurable threshold

### Historical Tracking

- **HIST-01**: Risk score history logged with timestamp — user can see how net risk evolved over time per asset
- **HIST-02**: Portfolio risk timeline chart showing capital-weighted risk score over months/years
- **HIST-03**: Mitigation history audit log (what was added, when, and what it changed)

### Scenario Simulation

- **SIM-01**: "What if X fails?" stress test — user marks asset as failed and sees hypothetical portfolio impact
- **SIM-02**: Scenario comparison view (current state vs simulated state side-by-side)

### Reporting

- **RPT-01**: Generate a PDF portfolio risk report with all assets, scores, mitigations, and warnings

### Multi-User

- **AUTH-01**: User authentication (email/password) for multi-user access
- **AUTH-02**: User isolation — each user sees only their own portfolio

## Out of Scope

Explicitly excluded to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Live market price feeds in v1 | Eliminates third-party API failure surface; manual pricing forces deliberate valuation; deferred to v2 |
| Multi-user authentication | Single-user personal tool; auth overhead adds complexity without v1 value |
| Native mobile app (React Native) | PWA covers installability without maintaining a second codebase |
| Social features / portfolio sharing | Antithetical to the sovereign risk philosophy — this data is private |
| Historical backtesting | Requires time-series data model; significant complexity; deferred to v2 |
| Automated risk scoring suggestions | Risk assessment is deliberate and personal; AI suggestions could create false confidence |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ASSET-01 | 2 — Asset Management | Pending |
| ASSET-02 | 2 — Asset Management | Pending |
| ASSET-03 | 2 — Asset Management | Pending |
| ASSET-04 | 2 — Asset Management | Pending |
| ASSET-05 | 2 — Asset Management | Pending |
| DIM-01 | 3 — Risk Dimensions & Scoring | Pending |
| DIM-02 | 3 — Risk Dimensions & Scoring | Pending |
| DIM-03 | 3 — Risk Dimensions & Scoring | Pending |
| DIM-04 | 3 — Risk Dimensions & Scoring | Pending |
| RISK-01 | 3 — Risk Dimensions & Scoring | Pending |
| RISK-02 | 3 — Risk Dimensions & Scoring | Pending |
| RISK-03 | 3 — Risk Dimensions & Scoring | Pending |
| RISK-04 | 3 — Risk Dimensions & Scoring | Pending |
| MIT-01 | 4 — Mitigations & Tags | Pending |
| MIT-02 | 4 — Mitigations & Tags | Pending |
| MIT-03 | 4 — Mitigations & Tags | Pending |
| MIT-04 | 4 — Mitigations & Tags | Pending |
| TAG-01 | 4 — Mitigations & Tags | Pending |
| TAG-02 | 4 — Mitigations & Tags | Pending |
| TAG-03 | 4 — Mitigations & Tags | Pending |
| PORT-01 | 5 — Portfolio Dashboard | Pending |
| PORT-02 | 5 — Portfolio Dashboard | Pending |
| PORT-03 | 5 — Portfolio Dashboard | Pending |
| PORT-04 | 5 — Portfolio Dashboard | Pending |
| WARN-01 | 6 — Concentration Warnings | Pending |
| WARN-02 | 6 — Concentration Warnings | Pending |
| WARN-03 | 6 — Concentration Warnings | Pending |
| INFRA-01 | 1 — Infrastructure & Project Foundation | Pending |
| INFRA-02 | 1 — Infrastructure & Project Foundation | Pending |
| INFRA-03 | 1 — Infrastructure & Project Foundation | Pending |
| INFRA-04 | 1 — Infrastructure & Project Foundation | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after roadmap creation*
