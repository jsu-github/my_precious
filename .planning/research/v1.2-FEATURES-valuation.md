# Feature Research — Portfolio Valuation
**Domain:** Precious metals portfolio valuation
**Milestone:** v1.2
**Researched:** 2026-04-13
**Confidence:** HIGH (domain knowledge + full codebase analysis + live market data from BullionStar April 2026)

---

## Context: This Investor Profile

The user is a **physical precious metals accumulator**, not a trader. Dutch jurisdiction, EUR-denominated, multi-entity (personal + B.V.). Holdings: bars and coins across gold/silver/platinum stored in 11 vaults across NL/CH. Buys on conviction, holds long-term. Does not sell frequently. Dutch Box 3 tax treatment: annual net worth tax applied to Jan 1 snapshot — FIFO/LIFO is irrelevant.

This determines which features are signal vs noise for this specific user.

---

## Feature Landscape

### Table Stakes — Users Expect These

Features a serious physical metals portfolio app cannot omit. These are the baseline a single-user physical investor needs to eliminate spreadsheets.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Spot price entry per metal** (XAU/XAG/XPT/XPD per gram) | Physical investors check spot daily; without it no value math is possible | Low | Manual entry is correct for this app. 4 metals × 1 EUR/g value. Store with timestamp. Requires new `spot_prices` table. |
| **Metal value per acquisition** (qty × weight_grams × spot) | "What is my gold worth at spot right now?" — the core derived value for any metals position | Low | Pure math; depends on spot_prices + existing weight/qty fields. Gated on sub_class + weight_per_unit not null. |
| **Cost basis vs metal value side-by-side** | Shows whether acquisition is above/below spot — the fundamental buy-quality signal | Low | Both already in DB; display-only work |
| **Portfolio total at spot** (Σ metal value) | Investor's primary "am I up or down vs what I paid" view | Low | Sum of acquisition-level metal values by entity |
| **Liquidation value on Valuation screen** (dealer We Buy × weight × qty) | What you actually walk away with — the real exit value | Low | Already computed in Ledger; promote to Valuation screen |
| **Premium paid per acquisition** (cost_basis − metal_value) | THE defining metric for physical metals: was the purchase price reasonable? Bars 1–3%, bullion coins 3–6%, numismatic 10–30%+ | Low | `cost_basis − (qty × toGrams(weight, unit) × spot)`  |
| **Premium % per acquisition** | Normalizes premium across different lot sizes; enables comparison across acquisition history | Low | `(premium_eur / metal_value) × 100` |
| **Total capital deployed** (Σ cost_basis) | "How much EUR have I converted to metal?" — the capital commitment view | Low | Σ acquisitions.cost_basis filtered by entity |
| **Unrealized P&L (liquidation basis)** (liq_value − cost_basis) | Real return accounting for dealer spread on exit — honest number | Low | Liq value already calculable from dealers data |
| **Breakdown by metal** (gold/silver/platinum subtotals) | Physical investors hold each metal for different reasons; per-metal view is mandatory | Low | Group by sub_class; already in DB |

---

### Differentiators — Competitive Advantage

Features that distinguish this dashboard from a spreadsheet or generic portfolio tracker. Specifically valuable for this user's context.

| Feature | Value Prop | Complexity | Notes |
|---------|------------|------------|-------|
| **Three-way value panel**: cost / metal value / liquidation — simultaneously | No generic tool shows all three in one view. Answers "what did I pay?", "what is the metal worth at spot?", and "what can I actually get from a dealer?" in parallel | Medium | Design choice: structured as a table or 3-column layout by sub_class row. One screen, all three lenses. |
| **Liquidation spread** (spot_value − liq_value) | Quantifies the paper-to-physical gap. In 2025–26 market, dealer spreads are widening with physical shortages (BullionStar raised premiums Feb 2026). Helps user evaluate dealer quality. | Low | Simple subtraction; minimal code, high contextual value |
| **Dealer-derived auto-valuation** replacing manual current_value | Eliminates stale manually-entered asset current_value; calculates real-time liquidation value from HollandGold we_buy_* prices | Medium | Requires: default dealer selection, fallback logic for crypto/cash/assets without weight. getDealerRate() already exists. |
| **Break-even spot price per acquisition** | "What spot price would eliminate my premium?" = `cost_basis / (qty × toGrams(weight, unit))`. Actionable for dollar-cost-averaging decisions. | Low | Pure math, display-only |
| **Premium aggregated by metal** | "How much total premium have I paid on silver vs gold?" — tracks buying quality across entire acquisition history | Low | Σ premium_eur grouped by sub_class |
| **Entity-separated valuation** | Legally significant: BV vs Privé metals must be valued separately for Dutch tax/balance sheet purposes | Low | Entity filter already built into App.tsx; apply same pattern to Valuation screen |

---

### Anti-Features — Commonly Requested, Often Problematic

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Live spot price feeds** (API integration) | Instant accuracy, no manual entry | API key management, rate limits, provider cost, failure modes, external dependency. Single-user manual app doesn't justify this complexity — updating spot takes 30 seconds. | Manual entry with prominent "last updated" timestamp. When user updates, all derived values recalculate instantly. |
| **IRR / time-weighted returns** | Sounds like professional-grade analysis | Physical gold produces no periodic cash flows. IRR is modeled around cash-in / cash-out series. For a buy-and-hold accumulator who almost never sells, IRR produces misleading or undefined results. | Total premium paid, unrealized P&L vs cost, unrealized P&L vs spot — honest and sufficient. |
| **Benchmark comparison** ("vs S&P 500 / CPI") | Standard in modern portfolio apps | Physical metals are held as **monetary insurance** and wealth preservation hedge. Comparing to equity performance misrepresents the investment thesis and creates cognitive noise. (BullionStar customers who bought in 2015, up ~4.5× by 2026, didn't buy to beat the S&P) | Show absolute EUR gain and % gain vs cost; that is sufficient. |
| **FIFO / LIFO lot optimization** | Standard in stock/crypto portfolio apps | Dutch Box 3 taxation: net worth is valued on Jan 1 each year at flat rate. Physical metals are Box 3 assets. There are no per-sale capital gains events. FIFO/LIFO is irrelevant for this tax jurisdiction. | Fiscal tags table already captures the right level of NL tax metadata. |
| **Price alerts / notifications** | "Tell me when gold hits €5,000/g" | No notification infrastructure in a fully-local, no-auth, no-background-process app. Email/push requires external services that violate v1 constraints. | Break-even spot and current P&L on the Valuation screen serve the same awareness function passively. |
| **Predicted future value / "what if gold reaches €X"** | Curiosity-driven | Speculation dressed as analysis. Adds UI complexity, encourages noise on stable long-term positions held for non-speculative reasons. | Break-even spot price is the correct analytical replacement — specific, actionable, no speculation. |
| **Multi-currency conversion** (USD/EUR toggling) | International price references (COMEX pricing in USD) | This portfolio is EUR-denominated throughout. All dealers, acquisitions, and transfers are in EUR. Adding FX introduces uncertainty. BullionStar provides EUR spot prices natively. | Stay EUR-only. Spot entry is EUR/g. No conversion needed. |
| **Disposal / realized gains tracking** | Natural follow-on once P&L is visible | No `sales` or `disposals` table exists. Adding this correctly requires a new data model (closed acquisitions, sale price per lot). This is v1.3 scope. | For v1.2: capital deployed is accurate. Capital returned via transfers table is an approximation — label it clearly. |

---

## What "Good" Premium Tracking Looks Like

Premium tracking for physical metals is not about fees — it's about **acquisition quality**. A serious stacker wants to know if they're buying smart.

### Per-Acquisition Level
1. **Premium EUR** = `cost_basis − (qty × toGrams(weight_per_unit, weight_unit) × spot_per_gram)`
2. **Premium %** = `(premium_eur / metal_value) × 100`
   - Gold bars (Umicore, C. Hafner): typically 1–3%
   - Gold coins (Maple Leaf, Krugerrand): 3–6%
   - Silver bars: 4–7%
   - Silver coins: 6–12%
   - Platinum bars: 3–6%
   - Numismatic/collector coins: 10–30%+
3. **Break-even spot** = `cost_basis / (qty × toGrams(weight_per_unit, weight_unit))`

### Aggregate Level
4. **Premium by metal** = Σ premium_eur grouped by `sub_class` — answers "how much total premium on my gold stack?"
5. **Portfolio premium total** = grand total — answers "what % of my capital is pure premium cost?"

### Display Discipline
- Premium is only meaningful for `precious_metals` assets with `weight_per_unit IS NOT NULL AND sub_class IS NOT NULL`
- Negative premium (bought below spot) is valid but rare for physical; should display as a positive signal
- Do NOT compute premium for crypto, cash, real_estate, or any non-weight-based asset

---

## Cash Flow Metrics for a Physical Metals Investor

Physical metals investors are **not traders**. They care about capital commitment and wealth preservation, not yield velocity or trading P&L. The correct lens:

| Metric | Definition | Formula | Data Source | Notes |
|--------|-----------|---------|-------------|-------|
| **Capital deployed** | Total EUR invested in open positions | Σ `acquisitions.cost_basis` | `acquisitions` | Entity filter applies. No closed/open flag exists — treats all acquisitions as open. |
| **Current liquidation value** | What you'd net calling Hollandgold today | Σ `qty × toGrams(weight) × getDealerRate(dealer, sub_class, product_type)` | `acquisitions + assets + dealers` | Precious metals only; fallback to `current_value` for others |
| **Current spot value** | Theoretical value at paper price | Σ `qty × toGrams(weight) × spot_per_gram` | `acquisitions + assets + spot_prices` | Precious metals with weight only |
| **Unrealized P&L (liq basis)** | True net position after dealer spread | `liquidation_value − capital_deployed` | Derived | The honest number for a physical investor |
| **Unrealized P&L (spot basis)** | Paper gain without spread | `spot_value − capital_deployed` | Derived | Shows how much of the move you've captured in theory |
| **Liquidation spread** | Cost of immediate exit | `spot_value − liquidation_value` | Derived | Represents dealer margin on full portfolio exit |
| **Capital returned** | Approximation: cash transfers between entities | Σ `transfers.amount` where source entity = filter | `transfers` | ⚠️ Proxy only. Captures inter-entity transfers (BV→Privé), not external dealer sales. Label clearly in UI. |
| **Net capital at risk** | Still deployed, net of returned | `capital_deployed − capital_returned` | Derived | Meaningful if transfers represent partial realizations |

---

## Dependency Map

What each v1.2 feature requires from existing vs new data:

```
NEW REQUIRED: spot_prices table
  Columns: id, metal (enum: xau|xag|xpt|xpd), price_per_gram (DECIMAL), recorded_at (TIMESTAMP)
  Append-only log; query latest per metal for calculations
  ↳ Required by: metal_value, premium, break-even, spot P&L

EXISTING — used unchanged:
  assets.weight_per_unit + assets.weight_unit           → toGrams() call; already in metalPricing.ts
  assets.sub_class + assets.product_type                → getDealerRate() dispatch; already in metalPricing.ts
  assets.asset_class                                    → gate: precious_metals only for weight-based calc
  acquisitions.cost_basis + acquisitions.quantity       → capital deployed, premium, P&L
  dealers.*we_buy*                                      → getDealerRate(); already in metalPricing.ts
  transfers.amount + from/to_entity_id                  → capital returned (approximation)

DERIVED (pure math — no new tables):
  metal_value         = qty × toGrams(weight_per_unit, weight_unit) × spot_per_gram
  liquidation_value   = qty × toGrams(weight_per_unit, weight_unit) × getDealerRate(dealer, sub_class, product_type)
  premium_eur         = cost_basis − metal_value
  premium_pct         = (premium_eur / metal_value) × 100
  break_even_spot     = cost_basis / (qty × toGrams(weight_per_unit, weight_unit))
  unrealized_pnl_liq  = liquidation_value − cost_basis
  unrealized_pnl_spot = spot_value − cost_basis
  liquidation_spread  = spot_value − liquidation_value
```

**Summary: 1 new table required (`spot_prices`). All other math built from existing schema.**

---

## Asset Type Handling Matrix

Requirements must scope what the Valuation screen shows per asset type:

| Asset Scenario | Spot Value | Premium | Liquidation | Notes |
|----------------|-----------|---------|-------------|-------|
| `precious_metals` + weight + sub_class | ✅ Calculated | ✅ Calculated | ✅ Calculated | Gold/silver/platinum/palladium bars and coins |
| `precious_metals` + missing weight or sub_class | ❌ Show "–" | ❌ Show "–" | ❌ Show "–" | Data gap — warn with icon; do not error |
| `crypto` | ❌ N/A | ❌ N/A | ❌ Manual `current_value` | No weight. PAXG/XAUT special case deferred to v1.3. |
| `cash` | ❌ N/A | ❌ N/A | ❌ Face value | current_value = face value |
| All other asset classes | ❌ N/A | ❌ N/A | ❌ Manual `current_value` | |

**Implication:** Valuation screen must visually segment precious metals (three-way split) from non-metals (cost + current value only). Mixing them in a single P&L table will corrupt the premium and spot calculations.

---

## Sources

- Codebase analysis: `types.ts`, `metalPricing.ts`, migrations 009–012, `DashboardPage.tsx`, `LedgerPage.tsx` — HIGH confidence (direct read)
- BullionStar live market data (April 13, 2026): XAU €4,033/oz, XAG €64/oz; dealer premium increases Feb 2026 amid physical shortages — HIGH confidence (live page)
- BullionStar editorial context: Physical-paper spread widening, dealer "We Buy" price dynamics, physical investors accumulating through volatility — MEDIUM confidence
- Dutch Box 3 tax treatment of physical precious metals: General knowledge; confirmed by existing fiscal_tags structure in codebase — MEDIUM confidence (not verified with official Belastingdienst sources; not needed for feature scope)
- Premium % ranges (bar vs coin): Well-established physical metals industry knowledge; consistent with dealer price structures — HIGH confidence
