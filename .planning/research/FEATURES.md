# Features Research — v1.1

**Domain:** Precious metals wealth management — market intelligence + sovereign tier allocation
**Researched:** 2026-04-11
**Overall confidence:** HIGH (grounded in actual codebase data + real import files)

---

## Dealer Price Management

### Context

User maintains 3–7 dealers (Hollandgold NL, Hollandgold CH, DNK, etc.) that quote "We Buy" (bid)
prices for gold per gram. Goal: see each acquisition's current liquidation value in the Ledger
so the user can instantly compare "what did I pay" vs "what can I get today."

**Critical data finding:** `acquisitions.quantity` is stored in **pieces**, not grams.
Confirmed from `hollandgold-beheer.csv`: a "Umicore 50 gram goudbaar" has `quantity=1` (one bar).
To compute liquidation value the system needs gram weight per unit — this does not currently
exist in the schema. This is the primary complexity risk for this feature area.

### Table Stakes

| Feature | Why | Complexity | Notes |
|---------|-----|-----------|-------|
| Dealers CRUD (name, contact notes) | Without it nothing works | Low | New `dealers` table + route + modal or inline form |
| `we_buy_gold` price per dealer (EUR/gram) | Core ask | Low | Single NUMERIC column, updated manually |
| Freshness indicator (`updated_at`) on dealer price | Without it user cannot trust whether the number is current | Low | Auto-updated by API on save; display as "Updated X days ago" |
| `weight_per_unit_grams` field on Asset | Required to compute liquidation value; `quantity` is pieces not grams | Medium | New nullable NUMERIC column on `assets` via migration; shown in AssetModal for precious_metals only |
| Global "Active Dealer" selector in Ledger filter bar | User needs to pick which dealer's price to apply | Low | React component state only — no DB persistence needed |
| "Liq. Value" column in Ledger when a dealer is selected | Core display requirement — only appears when dealer is active | Low | Computed client-side: `qty_pieces × weight_per_unit_grams × dealer.we_buy_gold`; shows "—" if weight is null |
| Gain/loss color on Liq. Value vs Cost Basis | Immediate signal: is this acquisition above or below purchase price? | Low | Green if `liq_value > cost_basis`, red if below |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|-----------|-------|
| Best-price badge | Immediately shows which dealer offers most value — useful when comparing Hollandgold vs DNK | Low | Sort dealers by `we_buy_gold` desc; mark top row with a gold accent in the dealer panel |
| Dynamic column header showing dealer name | "Liq. Value (Hollandgold NL)" — prevents confusion when switching dealers | Low | Single string interpolation in column header |
| Liquidation total in Ledger footer | Aggregate "what is my gold worth today at dealer X" in one number | Low | One additional `useMemo` reduce in LedgerPage |
| Liq. Value column in CSV export | Capture the the number on screen when exporting | Low | Extend existing `exportCSV()` function when a dealer is active |
| Per-metal pricing: silver + platinum | Hollandgold and DNK quote silver/platinum separately | Medium | Add `we_buy_silver`, `we_buy_platinum` to dealers; compute by `sub_class`; deferred to v1.2 — gold is sufficient for v1.1 |

### Anti-features (don't build)

| Anti-feature | Why Not |
|-------------|---------|
| Per-acquisition dealer selection (dropdown on every row) | 30+ rows × dropdown = unusable noise. Global selector is sufficient — user switches it when comparing. |
| Automatic price scraping from dealer websites | Requires live integration. Hard-blocked by PROJECT.md constraint: "No live price feeds in v1.x." |
| Price history / log of past we_buy prices | Valuable in v1.2 alongside valuation snapshots. Adds table + chart + query complexity now for marginal gain. |
| Spread vs spot price calculation | Requires live spot feed. Cannot compute without it. |
| Dealer rating / scoring | Personal tool — user knows their 3–7 dealers. No need. |
| Separate full-page "Dealers" nav item | Too heavyweight for a list of 3–7 rows. A panel or settings section is correct. |
| Multiple simultaneous dealer price columns | Showing all dealers as columns clutters the Ledger. One active dealer at a time is enough. |

### UX Recommendation

**Dealer management location:** A compact panel accessible from a "Dealers" button in the Ledger
filter bar. NOT a full nav page. The list is small enough to live inline.

**Interaction model:** Dealer panel shows a compact table — Name | We Buy (€/g) | Updated | Delete.
Clicking the price cell turns it into an in-place `<input>` (inline edit). Blur or Enter saves via
PATCH `/api/dealers/:id`. Append-row for new dealers inline. No separate create modal needed.

**Active dealer in Ledger:**
1. A "Dealers ▾" select in the Ledger filter bar (next to existing filter pills).
2. When a dealer is active, a new rightmost column appears: "Liq. Value (Dealer Name)".
3. Formula: `qty_pieces × asset.weight_per_unit_grams × dealer.we_buy_gold`
4. If `weight_per_unit_grams` is null on an asset → show "—" in that row (not an error state).
5. Ledger footer row shows total liquidation value for all visible rows.

**Weight field in AssetModal:** Add "Weight per unit (g)" numeric field, rendered only when
`asset_class === 'precious_metals'`. Position after Asset Class. Null by default on existing
assets — user fills in via Edit. Standard weights for reference: Maple Leaf 1oz = 31.10 g,
Umicore 50 g bar = 50.00 g, 100 g bar = 100.00 g.

---

## Tier System

### Context

4-tier sovereign wealth allocation framework for a Dutch private investor hedging against bank
insolvency, bail-in, CBDC mandates, and physical/cyber catastrophe:

| Tier | Label | Target | Description |
|------|-------|--------|-------------|
| 0 | Cash at Home | ~2% | Physical EUR notes, directly accessible, no counterparty |
| 1 | Digital Bank | ~8% | Current/savings accounts; exposed to bail-in risk |
| 2 | Physical Gold Vaults | ~70% | Vault-custodied precious metals (Hollandgold, DNK, etc.) |
| 3 | Crypto | ~20% | BTC, XMR; self-custodied, censorship-resistant |

Each asset belongs to exactly one tier. User configures target/min/max % per tier. Status
reflects whether actual allocation is within the configured band.

### Table Stakes

| Feature | Why | Complexity | Notes |
|---------|-----|-----------|-------|
| `tier` INT column on `assets` (0–3, nullable) | Foundation for everything else | Low | New migration; add Select to AssetModal with tier labels |
| Tier config table: `target_pct`, `min_pct`, `max_pct` per tier | Without bounds, status is meaningless | Low | New `tier_config` table with 4 seed rows; PATCH endpoint |
| Tier config UI: 4-row editable table | User needs to adjust bounds without touching code | Low | Inline numeric inputs; auto-save on blur; warn if targets ≠ 100% |
| TierPage: current % vs target per tier + status badges | Core deliverable of this milestone | Medium | New `TierPage.tsx`; nav entry in App.tsx + Sidebar |
| Status indicators: GREEN / AMBER / RED per tier | Immediate "is this okay?" signal without reading numbers | Low | GREEN = in [min, max]; AMBER = outside by ≤5pp; RED = outside by >5pp |
| Dashboard health tile | User opens dashboard daily — needs quick tier pulse | Low | New tile in DashboardPage using existing glass-panel tile pattern |
| Tier assignment works for crypto assets | PROJECT.md TIER-02: BTC/XMR as Tier 3 | Low | `asset_class = 'crypto'` already exists; tier assignment falls out from TIER-01 |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|-----------|-------|
| Per-tier asset list (expandable section) | User wants to know which specific assets are in Tier 2 and their values | Medium | Expandable bottom section on each tier card; filter of assets by tier value |
| Rebalancing hint text | "Tier 3 is 4% over target (~€8,200). Consider moving funds to Tier 1." — contextual guidance without a recommendation engine | Low | `(current_pct - target_pct) × total_portfolio_value`; shown as muted helper text when tier is amber/red |
| Range bar visualization | Shows min──●──max zone with current position marker — more information density than a plain progress bar | Low | CSS-only: position current-value dot on a normalized scale between 0–100%; three-zone coloring |
| Sum-to-100% warning on tier config | Without it, incoherent targets are silently accepted | Low | Amber badge "Targets sum to X%, not 100%" — advisory only, never blocking |
| Tier icon in AssetModal select | Visual anchoring: house, bank, vault, ₿ — enforces the mental model at point of entry | Low | lucide-react icons prefixed in option labels |

### Anti-features (don't build)

| Anti-feature | Why Not |
|-------------|---------|
| Custom / renaming tier labels | The 4-tier sovereign framework is intentional and fixed for this user. Renaming adds schema + UI complexity with no benefit. |
| More than 4 tiers | The model is specifically 4-tier. Extensibility here is unused complexity. |
| Lock targets to force-sum to 100% (block save) | Too rigid — user may be mid-edit; actual allocation is dynamic. Warn, never block. |
| Historical tier allocation tracking (time series) | Requires snapshot mechanism already out of scope. Defer to v1.2 alongside valuation snapshots. |
| Drag-to-rebalance visualization | Over-engineered for a personal tool. Hint text with a EUR amount is sufficient action guidance. |
| Tier axis on the Location map | The map already encodes jurisdiction/custody. Overlaying tier creates conflicting signal. |
| Risk scoring within a tier | Asset-level SecurityClass already exists. Tier-level risk score duplicates it. |
| Automated rebalancing actions | Requires live prices + brokerage APIs. Manual tool only. |
| Currency exposure breakdown by tier | Interesting analytically; all positions are EUR-denominated already. v1.2 territory. |

### UX Recommendation

**Tier assignment in AssetModal:** Add one `<Field label="Sovereign Tier">` with a Select below
Asset Class. Options: `— Unassigned —`, `0: Cash at Home`, `1: Digital Bank`,
`2: Physical Gold Vault`, `3: Crypto`. Muted monochrome tier number prefix enforces the numbering
without colored noise in a form context.

**Tier config panel:** Collapsible section at the top of TierPage. Four rows in a compact inline-
editable table: Tier | Name | Target % | Min % | Max %. Each numeric cell is an `<input type="number">`.
Auto-save on blur via PATCH. Show sum of targets below with amber highlight if ≠ 100%.
No separate Save button — reduces friction for frequent adjustments.

**TierPage layout:** Four tier cards in a single-column vertical list (not a 2×2 grid — tiers
are hierarchical and should read top-to-bottom in order 0→3). Each card:

```
┌──────────────────────────────────────────────────────────┐
│ TIER 2  Physical Gold Vault              ● IN RANGE       │
│                                                          │
│  Current: 72.4%   Target: 70%   Range: 65% – 75%        │
│                                                          │
│  [below-min zone][░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓][above-max]  │
│                  65%      ▲70%     ●72.4%   75%          │
│                                                          │
│  €482,000 · 12 assets                                    │
│  ▸ Show assets                                           │
└──────────────────────────────────────────────────────────┘
```

The range bar has three CSS zones: below-min (muted), in-range (primary/gold fill), above-max
(amber). A tick mark for target; a dot for current position. Pure CSS — no canvas, no chart lib.

**Status thresholds (deterministic):**
- GREEN: `current_pct >= min_pct AND current_pct <= max_pct`
- AMBER: outside range but delta ≤ 5 percentage points in either direction
- RED: outside range by > 5 percentage points

Hardcode 5pp in v1.1. If configurable tolerance is wanted, add it in v1.2.

**Dashboard health tile:** Use existing `.glass-panel` tile pattern. Content:
- Headline: "3 of 4 Tiers In Range" (or "All Tiers In Range" / "2 Tiers Off Target")
- Four status dots + tier short-labels in two rows
- No supplemental charts — dots are sufficient at health-tile scale
- Click/tap navigates to TierPage

---

## Dependencies on Existing Features

| New Feature | Depends On | Change Required |
|-------------|-----------|----------------|
| Dealer liquidation column in Ledger | `acquisitions.quantity` (pieces) + new `assets.weight_per_unit_grams` | **Migration 010** adds `weight_per_unit_grams NUMERIC(10,4) nullable` to `assets`; update `Asset` + `CreateAsset` in `types.ts`; add field to `AssetModal` |
| Dealer API | Nothing existing — new resource | New `dealers` table; `api/routes/dealers.ts`; mount in `routes/index.ts`; new `api.dealers.*` methods in `api.ts` |
| Ledger dealer column display | Existing `LedgerRow` type + `buildEnrichedRows()` | `LedgerRow` needs no server changes; liquidation computed entirely client-side; LedgerPage gets: dealer state hook + conditional column + footer sum |
| Tier assignment on assets | `Asset` + `CreateAsset` types | **Migration 011** adds `tier INT nullable` to `assets`; update `Asset` + `CreateAsset`; add field to `AssetModal` |
| Tier config | Nothing existing | **Migration 011** also creates `tier_config` with 4 seed rows; new GET + PATCH endpoint; new `api.tierConfig.*` in `api.ts` |
| TierPage | `assets` list + new tier_config endpoint | New `TierPage.tsx`; nav entry in discriminated union in `App.tsx`; new sidebar nav item in `Sidebar.tsx` |
| Dashboard health tile | Tier totals derivable from assets list | Extend `/api/dashboard` route to return tier summary, OR compute from assets in DashboardPage. Prefer server-side: keeps component logic thin. |
| Crypto as Tier 3 assets | `asset_class = 'crypto'` (already exists); `tier` field (TIER-01) | No additional work beyond TIER-01 — falls out naturally |

### Recommended migration sequence

```
010_dealer_prices.ts      → create dealers table
                            (id, name, contact_notes, we_buy_gold, we_buy_silver,
                             we_buy_platinum, updated_at, created_at)

011_weight_and_tier.ts    → ALTER assets ADD weight_per_unit_grams NUMERIC(10,4)
                            ALTER assets ADD tier INT
                            CREATE tier_config (tier_id PK, target_pct, min_pct, max_pct)
                            INSERT 4 default tier_config rows (0,2,0,5), (1,8,4,12),
                              (2,70,60,80), (3,20,10,30)
```

Combining weight + tier into one migration (011) is efficient — both touch `assets`, no interdependency.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|-----------|-------|
| Dealer price UX | HIGH | Grounded in actual LedgerPage code + real CSV data |
| Quantity-is-pieces finding | HIGH | Direct inspection of `hollandgold-beheer.csv` and `acquisitions` migration confirms |
| Weight field necessity | HIGH | Cannot compute EUR/gram liquidation without it given current schema |
| Tier UX patterns | HIGH | Standard portfolio allocation patterns; no novel technology required |
| Status threshold (5pp buffer) | MEDIUM | Pragmatic; common in financial tooling; configurable in v1.2 if needed |
| Migration sequence | HIGH | Follows existing sequential convention in `api/migrations/`; verified pattern from 001–009 |
