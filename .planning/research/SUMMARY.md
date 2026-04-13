# Research Summary — v1.2 Portfolio Valuation

**Synthesized:** 2026-04-13  
**Sources:** STACK.md · FEATURES-v1.2-valuation.md · ARCHITECTURE.md · PITFALLS.md  
**Overall Confidence:** HIGH — all findings grounded in live codebase + live BullionStar market data (April 2026)

---

## Stack Additions

| Library | Version | Need | Decision |
|---------|---------|------|----------|
| _(none)_ | — | — | Zero new npm packages. All v1.2 features are derived math + a new DB table + a new page. Existing stack (Knex, pg, Express, React, Tailwind) covers everything. |

**No installation step required for v1.2.**

---

## Feature Table Stakes

Must-have for this milestone to feel complete. Without any one of these, the user still needs a spreadsheet.

- **Spot price entry** — 4 metals × EUR/g, manual entry, stored with timestamp. Everything else is gated on this.
- **Metal value per acquisition** — `qty × toGrams(weight) × spot_per_gram`. The core derived number.
- **Cost basis vs metal value** side-by-side — "am I above or below spot?"
- **Premium paid + premium %** per acquisition — THE defining physical metals metric; reveals buying quality.
- **Portfolio total at spot** — Σ metal value per entity; primary "where do I stand?" number.
- **Total capital deployed** — Σ `cost_basis`; answers "how much EUR have I converted to metal?"
- **Unrealized P&L (liquidation basis)** — `liq_value − cost_basis`; the honest number (includes dealer spread on exit).
- **Breakdown by metal** (gold / silver / platinum subtotals) — each metal serves a different purpose; grouping is mandatory.
- **Entity-separated view** — BV vs Privé must be individually valued for Dutch tax (Box 3 Jan 1 snapshot).

---

## Feature Differentiators

What separates this from a spreadsheet or generic tracker.

- **Three-way value panel per acquisition**: cost / spot value / liquidation value simultaneously — no generic tool shows all three lenses on one screen.
- **Liquidation spread** (`spot_value − liq_value`) — quantifies the paper-to-physical gap; contextually valuable as dealer spreads widen in 2025–26 physical shortage market.
- **Break-even spot price per acquisition** — "what spot price would eliminate my premium?" = `cost_basis / (qty × toGrams(...))`. Actionable for DCA decisions, zero speculation.
- **Premium aggregated by metal** — Σ premium_eur grouped by sub_class: "how much total premium on my gold stack vs silver?"
- **Dealer-derived auto-valuation** replacing stale manual `current_value` — liquidation value calculated from HollandGold `we_buy_*` prices via existing `getDealerRate()`.

**Explicitly deferred (do not build in v1.2):**
- Live price feeds — external dependency, rate limits, unnecessary for a 30-second manual update
- IRR / time-weighted returns — meaningless for a buy-and-hold physical accumulator with no cash flows
- FIFO/LIFO — irrelevant under Dutch Box 3 taxation (net worth on Jan 1, no per-sale CGT events)
- Disposal / realized gains tracking — requires new `sales` data model; v1.3 scope

---

## Architecture: New vs Modified

| New | Modified |
|-----|----------|
| `api/migrations/021_spot_prices.ts` | `assets.current_value` (written in-place by recalculate) |
| `api/src/routes/spotPrices.ts` (`GET /latest`, `POST /`) | `api/src/routes/index.ts` (register two new routers) |
| `api/src/routes/valuation.ts` (`GET /summary`, `GET /breakdown`, `POST /recalculate`) | `frontend/src/types.ts` (SpotPrice, ValuationSummary, ValuationRow types) |
| `frontend/src/pages/ValuationPage.tsx` | `frontend/src/api.ts` (spotPrices, valuation namespaces) |
| `valuation_snapshots` table (separate migration) | `frontend/src/App.tsx` (add `'valuation'` to View union + switch case) |

**Hybrid valuation pattern (canonical):** `assets.current_value` stays as the single stored field read by dashboard, ledger, tier, and analytics. `POST /api/valuation/recalculate` computes fresh values from spot prices, writes back to `current_value`, and inserts `valuation_snapshots` rows. This is the same pattern as the existing `PUT /api/assets/:id` manual edit — no consumer changes needed.

---

## Recommended Build Order

1. **Migration 021** — `spot_prices` table (`metal`, `price_per_gram`, `recorded_at`). Append-only log; `DISTINCT ON (metal)` for latest. Unblocks everything below.
2. **`spotPrices.ts` route + register** — `GET /api/spot-prices/latest` and `POST /api/spot-prices`. Add SpotPrice types + `api.spotPrices.*` methods. Smoke-test with curl before touching frontend.
3. **`valuation.ts` route** — `GET /summary`, `GET /breakdown`, `POST /recalculate`. Add null-check guards on every UPDATE branch (critical — see Risks). Add ValuationSummary + ValuationRow types.
4. **SpotPriceEntry component** — small inline UI to enter 4 spot prices; lives in ValuationPage header. Validates numeric input; shows "last updated" timestamp per metal.
5. **ValuationPage.tsx** — three-way panel (cost / spot / liq) segmented by metal then non-metals. Premium + break-even columns. Per-entity filter (reuse existing pattern from Dashboard/Ledger).
6. **Recalculate trigger** — button on ValuationPage calling `POST /api/valuation/recalculate`; refreshes page data. All other pages (dashboard totals, ledger, tier) auto-reflect via updated `current_value`.

---

## Top Risks / Watch Out For

- 🔴 **`current_value` corruption** — `POST /api/valuation/recalculate` MUST skip any asset whose required inputs are null or missing. If `spot_prices` table is empty or a metal has no price, the UPDATE for that asset must be **omitted entirely** (preserve existing value). A zero or NULL write here breaks dashboard totals, tier allocations, and portfolio history silently — cascading corruption across the whole app.
- 🔴 **NUMERIC columns return as strings** — `spot_prices.price_per_gram` (and all NUMERIC columns) come back from the pg driver as `string`, not `number`. Every arithmetic operation needs `parseFloat()`. Missing one causes silent NaN propagation. Documented in `types.ts` line 1 but easy to miss in two new route files.
- 🟠 **Weight/sub_class null gate** — Premium, metal value, and break-even are undefined for assets without `weight_per_unit` or `sub_class`. Return `null` from the API (not `0`, not `undefined`). Render `–` in the table cell. Do not hide rows — show the data gap visually.
- 🟠 **Valuation page asset type mixing** — Precious metals (three-way: cost/spot/liq + premium) and non-metals (cost/current_value only) must be visually segmented. Rendering them in a single flat table makes premium and spot columns show bogus values for cash/real estate rows.
- 🟡 **`routes/index.ts` not updated** — New route files for `spotPrices` and `valuation` return 404 silently until imported and mounted in `routes/index.ts`. Do this in the same commit as the route file. (PITFALLS C8.)
- 🟡 **`DISTINCT ON (metal)` semantics** — Query for latest spot price must be `SELECT DISTINCT ON (metal) ... ORDER BY metal, recorded_at DESC`. A naive `MAX(recorded_at)` subquery approach is also valid but verbose. Confirm the query produces exactly 1 row per metal before wiring it to the recalculate branch.

---

## Open Questions

1. **`valuation_snapshots` schema** — Does it snapshot `(asset_id, value, recorded_at)` only, or also capture `spot_per_gram` at time of snapshot for auditability? Decide before writing the migration.
2. **Recalculate trigger UX** — Manual button ("Calculate at current spot") or auto-trigger on spot price save? Recommend manual with "last calculated at [timestamp]" indicator — auto has risk if user enters an erroneous spot price.
3. **Default dealer for liquidation on ValuationPage** — `getDealerRate()` requires a dealer per asset. Does ValuationPage use the same active-dealer selector as the Ledger, or does it hardcode the user's primary dealer, or show the lowest available bid? Needs a decision before building the breakdown API.
4. **Non-metal rows on ValuationPage** — Show crypto/cash/real estate rows with `current_value` alongside metals (full portfolio view) or show precious metals only (focused valuation)? Both are defensible; decide before designing the breakdown table.
5. **`valuation_snapshots` migration number** — Architecture assigns 021 to `spot_prices`. Is `valuation_snapshots` bundled in 021 or a separate 022 migration? Separate is cleaner for rollbacks.

---

*Sources: STACK.md (April 9 + April 11, 2026) · FEATURES-v1.2-valuation.md (April 13, 2026) · ARCHITECTURE.md (April 13, 2026) · PITFALLS.md (April 11, 2026)*
