# Precious Dashboard

## What This Is

A Sovereign Risk Management dashboard for the serious, defensive investor. Unlike conventional portfolio trackers that only ask "what do you own?", Precious Dashboard asks "how secure is your ownership?" — crossing asset exposures across multiple risk dimensions (Counterparty, Liquidity, Geography, and custom) to surface blind spots that pure return-focused tools cannot see. The result is a capital-weighted view of portfolio resilience, not just portfolio value.

## Core Value

Every asset in the portfolio must have a quantified gross risk, at least one mitigation action, and a visible net residual risk — making the difference between "I own it" and "I control it" explicit and measurable.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Generic asset model — any asset type (gold, real estate, stocks, crypto, stablecoins) stored uniformly with no built-in category bias
- [ ] Customizable risk dimensions — defaults: Counterparty, Liquidity, Geography; user can add custom dimensions (e.g. Climate Risk, Code Risk)
- [ ] Gross risk scoring — 5-point scale: Extra Low / Low / Medium / High / Critical per asset-per-dimension
- [ ] Mitigation actions — user attaches concrete measures taken per risk dimension (e.g. "Hardware wallet purchased", "Insurance taken out")
- [ ] Net residual risk — post-mitigation adjusted score, calculated and stored separately from gross risk
- [ ] Capital-weighted portfolio risk score — high residual risk on a €500 position barely moves the needle; €500k position dominates
- [ ] Tags & groupings — cross-cutting labels (e.g. "Outside banking system", "EU jurisdiction", "Grid-dependent") enable concentration analysis across otherwise unrelated assets
- [ ] Risk heatmap — visual (spider/heat chart) showing where concentration risks sit; goes red on critical concentrations
- [ ] Concentration warnings — detects when a large % of total capital is indirectly exposed to a single jurisdiction, infrastructure type, or counterparty via tags
- [ ] Manual asset valuation — user enters current values manually in v1; no live market feed dependency
- [ ] Docker-based stack — PostgreSQL + app containers; everything runs locally, no cloud dependency
- [ ] PWA — installable on desktop/mobile from the browser (offline-capable shell)
- [ ] English UI — all interface copy in English

### Out of Scope

- Live market price feeds (CoinGecko, Yahoo Finance, etc.) — deferred to post-v1 extension; manual pricing avoids third-party dependencies in v1
- Multi-user authentication / accounts — single-user personal tool; no auth overhead in v1
- Mobile-native app (React Native / Expo) — PWA covers installability without a second codebase
- Social features / portfolio sharing — out of scope for personal risk tool
- Historical backtesting / time-series risk evolution — valuable future feature, not v1

## Context

**Investor archetype:** Defensive, sovereignty-minded investor holding a mix of physical assets (gold, real estate) and digital assets (crypto, stablecoins). Not a day trader — a long-term capital preserver. Thinks in terms of systemic risk, jurisdictional risk, and infrastructure dependencies.

**Market gap:** Existing portfolio trackers (Delta, CoinTracker, bank apps) measure wealth. None measure resilience. They compute `Value = Quantity × Price` and stop there. Precious Dashboard introduces the mitigation loop: Gross Risk → Mitigation → Net Residual Risk.

**Testcase that validates the model:** Physical gold (Krugerrand, home vault) paired with PAXG (gold-backed stablecoin on Ledger). Together they hedge each other's weaknesses: gold covers liquidity failure of PAXG; PAXG covers illiquidity / physical-access risk of gold in a crisis. The app makes this cross-hedge visible and quantifiable.

**Stack rationale:** React + TypeScript (PWA) fronted backed by a REST API in Node.js/Express (or similar lightweight) writing to PostgreSQL — everything containerized via Docker Compose. No BaaS dependency (Supabase, Firebase) keeps the stack sovereign and auditable.

## Constraints

- **Tech Stack:** React + TypeScript (frontend), PostgreSQL (database), Docker Compose (runtime) — decided
- **Pricing:** Manual asset valuation only in v1 — no external API calls for prices
- **Auth:** None in v1 — single-user personal tool; backend assumes trusted local environment
- **Language:** English UI only for v1 — no i18n infrastructure
- **Platform:** PWA — must be installable and have an offline-capable shell

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Generic asset model (no category bias) | Enables gold, real estate, stocks, crypto to coexist in same data model without special-casing | — Pending |
| 5-point risk scale (Extra Low → Critical) | Granular enough to differentiate meaningful risk levels; coarser than arbitrary 1-10 scale reduces decision fatigue | — Pending |
| Capital weighting for portfolio score | Prevents small positions from distorting overall risk picture; reflects real-world impact correctly | — Pending |
| Gross + Net risk stored separately | Net residual is the truth after mitigations, but gross risk must remain visible to show the raw exposure being managed | — Pending |
| Docker Compose (no BaaS) | Full data sovereignty; no dependency on third-party cloud services; aligns with app's own philosophy of reducing counterparty risk | — Pending |
| Manual pricing in v1 | Eliminates third-party API failure surface; forces user to consciously maintain valuations | — Pending |
| PWA over native mobile | Single codebase; installable from browser; avoids App Store gatekeeping | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 after initialization*
