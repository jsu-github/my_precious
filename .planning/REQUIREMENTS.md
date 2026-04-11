# Requirements: v1.1 — Market Intelligence & Sovereign Tier System

## Milestone Goal

Add manually-maintained dealer buy prices for gold and a 4-tier sovereign portfolio risk allocation system with configurable target/min/max bounds and visual status indicators.

---

## v1.1 Requirements

### Data Model Extensions

- [ ] **DATA-01**: User can set and edit a `weight_per_unit_grams` value on each asset (e.g., 50g bar = 50, 1 troy oz coin ≈ 31.1) via the Edit Asset modal

### Market Data Management

- [ ] **MKTD-01**: User can create, edit, and delete dealers (name, optional notes)
- [ ] **MKTD-02**: User can set a "We Buy" (bid) price per gram for gold on each dealer
- [ ] **MKTD-03**: Ledger shows a liquidation value column computed as `quantity × weight_per_unit_grams × dealer.we_buy_price_per_gram` using a user-selectable dealer

### Tier System

- [ ] **TIER-01**: User can assign a Tier (0–3) to each asset via the Edit Asset modal
- [ ] **TIER-02**: User can add crypto holdings (BTC, XMR) as standard assets with `asset_class = 'crypto'` and manually-entered EUR current value, then assign them to Tier 3
- [ ] **TIER-03**: User can configure target %, minimum %, and maximum % per tier on the Tier page (4 fixed tiers: 0 = Grid-Down, 1 = Digital Liquidity, 2 = The Vaults, 3 = Uncensorable Frontier)
- [ ] **TIER-04**: Dedicated Tier page shows current allocation % vs target/min/max bounds for each tier with green (in bounds) / amber (near limit) / red (out of bounds) status
- [ ] **TIER-05**: Dashboard shows a Tier health summary tile with per-tier status at a glance

---

## Future Requirements (Deferred)

- Price automation / live price feeds for precious metals — deferred to v1.2
- We Buy + You Sell (ask) prices — You Sell / spread tracking deferred to v1.2
- Silver and platinum dealer prices — gold only in v1.1; extend in v1.2
- Price history / trend charts per dealer — deferred to v1.2
- Rebalancing suggestions (how much to move where) — deferred to v1.2
- Hard limit enforcement on tier allocation (prevents adding assets that push out of bounds) — deferred
- PDF export of tier report — deferred (CSV first)

---

## Out of Scope (v1.1)

- **Live/automated price feeds**: All dealer prices entered manually; automation adds integration complexity
- **Multi-metal dealer pricing**: Gold only — silver/platinum follow the same pattern once gold UI is validated
- **Spread calculation (ask − bid)**: Ask price deferred; spread is meaningless with only bid
- **Rebalancing automation**: Suggestions require defining transfer/sale workflows not yet in scope

---

## Traceability

| REQ-ID  | Phase | Status |
|---------|-------|--------|
| DATA-01 | TBD   | —      |
| MKTD-01 | TBD   | —      |
| MKTD-02 | TBD   | —      |
| MKTD-03 | TBD   | —      |
| TIER-01 | TBD   | —      |
| TIER-02 | TBD   | —      |
| TIER-03 | TBD   | —      |
| TIER-04 | TBD   | —      |
| TIER-05 | TBD   | —      |
