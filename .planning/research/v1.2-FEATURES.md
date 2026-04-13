# Feature Landscape — v1.3 Crypto Asset Tracking

**Domain:** Crypto asset tracking within a precious metals portfolio dashboard (no live feeds, single-user, manual entry)
**Researched:** 2026-04-13
**Confidence:** HIGH — PAXG/XAUT mechanics from official sources; wallet taxonomy from industry standards; existing codebase read directly

---

## Existing Infrastructure (do not re-build)

The codebase already has the following, which v1.3 extends rather than replaces:

| Already Present | Location | Notes |
|----------------|----------|-------|
| `asset_class = 'crypto'` enum value | `assets` table / `AssetClass` type | Valid, used by Tier 3 |
| `quantity` DECIMAL(20,6) | `acquisitions` table | 6 decimals — may need 8 for crypto precision |
| `sub_class`, `product_type` | `assets` columns | Re-usable for crypto categorisation |
| `current_value` (manual EUR) | `assets.current_value` | Current crypto approach; replaced by computed value |
| `spot_prices` table | migration 021 (v1.2) | `(metal, price_per_gram, recorded_at)` — append-only, XAU already here |
| Tier assignment | `assets.tier` | Crypto → Tier 3 |
| Map pins + location model | `asset_locations` table | `custodian_name`, `country_code` — extensible |

---

## Table Stakes

Features a precious-metals tracker user expects when crypto is added. Missing = crypto tracking feels broken.

### 1. Coin Identification Fields

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `coin_symbol` | VARCHAR(20) | `XMR`, `PAXG`, `XAUT`, `BTC` | Primary lookup key for spot prices |
| `coin_name` | VARCHAR(100) | `Monero`, `Pax Gold`, `Tether Gold` | Display name; distinct from asset `name` |

**Why:** Every portfolio tracker (CoinTracker, Koinly, Delta, Rotki) uses symbol as the canonical identifier. The asset `name` field is user-freeform (e.g. "My Ledger XMR"); `coin_symbol` is the standardised ticker used to lookup prices. Without it, the spot price ↔ asset link requires fragile name-matching.

**Complexity:** Low — two VARCHAR columns on `assets` via migration.

**Sub-class usage (reuse existing field):**
- PAXG, XAUT → `sub_class = 'gold'` (gold-backed ERC-20/TRC-20 tokens)
- XMR → `sub_class = 'privacy'` (or leave null in v1.3)
- BTC/ETH → `sub_class = null` or per discretion

**Product type usage (reuse existing field):**
- Native coins (XMR, BTC, ETH) → `product_type = 'native_coin'`
- ERC-20/TRC-20 tokens (PAXG, XAUT) → `product_type = 'token'`

---

### 2. Quantity × Spot Price Valuation Model

**Current state:** `assets.current_value` is a manually typed integer. Users enter "my XMR is worth €4,200" by hand with no quantity breakdown.

**Table-stakes model:** `value = total_quantity × spot_price_per_unit_eur`

| Component | Details |
|-----------|---------|
| Quantity source | Sum of `acquisitions.quantity` per asset (already stored at acquisition time) |
| Spot price source | New `crypto_spot_prices` table (see below) |
| Precision | Acquisitions `quantity` should be DECIMAL(20,8) for crypto (upgrade from 20,6) |
| Trigger for update | User manually updates spot price via UI (same workflow as precious metals spot prices in v1.2) |

**`crypto_spot_prices` table:**
```sql
CREATE TABLE crypto_spot_prices (
  id             SERIAL PRIMARY KEY,
  symbol         VARCHAR(20) NOT NULL,        -- 'XMR', 'BTC', 'ETH' (NOT PAXG/XAUT — see gold-backed section)
  price_per_unit NUMERIC(20,8) NOT NULL,       -- EUR per 1 full token/coin
  recorded_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_crypto_spot_symbol_recorded ON crypto_spot_prices(symbol, recorded_at DESC);
```

Design: append-only, same pattern as `spot_prices`. "Latest price per symbol" = `DISTINCT ON (symbol) ORDER BY recorded_at DESC`.

**Complexity:** Low — one new table + UI form + aggregation query. Structurally identical to metals spot prices being built in v1.2.

---

### 3. Gold-Backed Token Handling (PAXG, XAUT)

**What these tokens are:**

| Token | Issuer | Network | Backing | Precision | Vaults |
|-------|--------|---------|---------|-----------|--------|
| PAXG | Paxos Trust (OCC-regulated, US) | Ethereum ERC-20 | 1 token = 1 fine troy ounce (31.1035g) LBMA gold | Fractional ok | LBMA London |
| XAUT | Tether / TG Commodities (Swiss) | Ethereum ERC-20 + Tron TRC-20 | 1 token = 1 fine troy ounce of gold | Min 0.000001 oz | Swiss vaults |

Both tokens track XAU spot price closely (small premium, typically <1%). Both are physically redeemable for gold bars. XAUT's "Scudo" sub-unit = 1/1000 XAUT (internal Tether unit, not relevant to tracking).

**How portfolio trackers handle them:**
- **Generic approach (CoinTracker, Koinly):** Treat as ordinary crypto tokens (qty × token market price). No gold-specific treatment.
- **Precious-metals-aware approach (Rotki, power-user spreadsheets):** Dual-class: crypto position + gold oz exposure. Value comes from `qty × XAU_spot` not from a separate token spot price, because XAU is already tracked.

**Recommendation for Precious Dashboard — use the gold-backed path:**

Since XAU spot prices already exist in `spot_prices` (v1.2) and the dashboard models gold by troy oz, PAXG/XAUT can derive their EUR value from the shared XAU spot table:

```
PAXG / XAUT valuation:
  quantity_oz = sum(acquisitions.quantity)    -- stored as troy oz; 1 token = 1 troy oz
  value_eur   = quantity_oz × 31.1035 × xau_spot_per_gram
```

This means:
- PAXG/XAUT do **not** need an entry in `crypto_spot_prices`
- Their `coin_symbol` ('PAXG' / 'XAUT') is used for display only
- Their `sub_class = 'gold'` is the branch condition in valuation logic
- Acquisitions `quantity` is stored as **troy oz** (matching 1 token = 1 oz convention)

**Why this is correct:** It keeps gold exposure consolidated. A user holding 2 PAXG + 100g physical gold sees the true combined gold position rather than two isolated figures across separate price feeds.

**Complexity:** Medium — valuation aggregation route needs a conditional branch: if `asset_class='crypto'` AND `sub_class='gold'` → use XAU spot path; else use `crypto_spot_prices` path.

---

### 4. Wallet / Custody Type Classification

**What precision-minded crypto holders need:** Know at a glance whether each holding is in self-custody vs. counterparty custody vs. exchange.

**Industry-standard taxonomy** (used consistently across CoinTracker, Koinly, Rotki, Delta, Ledger Live):

| Enum Value | Display Label | Description | Risk Profile |
|------------|--------------|-------------|--------------|
| `exchange` | Exchange | Custodial exchange (Kraken, Bitvavo, Coinbase, Binance) | Counterparty risk — not your keys |
| `hot_wallet` | Software Wallet | Non-custodial, internet-connected (MetaMask, Exodus, Monero GUI/CLI) | Self-custody, exposed to online attacks |
| `hardware_wallet` | Hardware Wallet | Non-custodial, air-gapped device (Ledger, Trezor, Coldcard, Passport) | Best self-custody practice |
| `paper_wallet` | Paper Wallet | Printed/written private keys, fully offline | High security if stored correctly |
| `custodian` | Custodian | Institutional third-party custody (BitGo, Casa, Coinbase Custody) | Professional custody, not an exchange |

**Where to store it:** New `custody_type` field on `assets` (not `asset_locations`), because:
- A location can mix physical vault and crypto (e.g. a hardware wallet stored in the same safe as bullion)
- Custody type is a property of *how the asset is held*, not *where the physical location is*
- It maps directly to Tier 3 sovereign risk scoring

**Complexity:** Low — one VARCHAR column on `assets` via migration + dropdown in AssetModal.

**XMR-specific note:** Monero is a privacy coin — on-chain addresses cannot be publicly tracked by third parties (no transparent ledger). Custody type is the only meaningful custodian identifier for XMR. No on-chain address field needed.

---

### 5. Computed Value Propagation

Replacing manual `current_value` with derived crypto value must propagate to all consuming screens:

| Screen | Impact |
|--------|--------|
| Dashboard net worth tile | Must include `sum(qty) × spot` for crypto assets |
| Ledger value column | Show computed EUR value per row |
| Analytics page allocation | Crypto % of total must use computed values |
| Tier allocation calculation | Tier 3 total weight must reflect real computed value |

**Fallback rule:** If no matching `crypto_spot_prices` entry exists for a symbol (and asset is not gold-backed), fall back to `assets.current_value`. This preserves backwards compatibility with existing manual crypto entries.

**Complexity:** Medium — multi-screen change; touches valuation aggregation API endpoint + multiple frontend components.

---

## Differentiators

Features that add value beyond the baseline. Build after table stakes are solid.

| Feature | Value Proposition | Complexity | Priority |
|---------|-------------------|------------|----------|
| **Gold oz equivalent display** | PAXG/XAUT rows show "2.5 oz gold equivalent" alongside EUR — reveals true gold exposure | Low (derived from qty) | High — aligns uniquely with PM dashboard theme |
| **Combined gold exposure summary** | Analytics: physical gold oz + PAXG oz + XAUT oz = total gold oz position | Low (sum of `sub_class='gold'` assets) | High — unique differentiator vs generic crypto trackers |
| **Network / chain field** | `network` VARCHAR(30): 'Ethereum', 'Tron', 'Monero' — relevant for custody categorisation | Low | Medium |
| **Contract address storage** | Read-only reference field for ERC-20 address (PAXG: `0x45804880...`, XAUT: `0x68749665...`) — for manual Etherscan verification | Low | Low |
| **Custody risk indicator** | Visual badge on LocationsPage and asset rows: self-custody (hardware/paper) vs. custodial (exchange/custodian) | Low (derive from `custody_type`) | Medium |

---

## Anti-Features

Features to explicitly **not** build in v1.3.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Live price feeds | Explicitly out of scope per PROJECT.md v1 constraints; adds API dependencies, failure modes | Manual spot price entry — established UX pattern |
| Exchange API connections (Kraken, Bitvavo, etc.) | Auth complexity, rate limits, secret management; out of scope for single-user local tool | CSV import from exchange if bulk data needed |
| On-chain address → balance sync | Blockchain node/API dependency; fundamentally broken for XMR (privacy coin, no transparent ledger) | Manual quantity entry at acquisition time |
| DeFi / staking position tracking | Entirely different data model (locked positions, yield accrual, impermanent loss) | Not applicable to XMR, PAXG, XAUT |
| FIFO/LIFO crypto tax-lot calculation | Requires per-transaction accounting engine; duplicates future Tax page work | Defer to dedicated Tax milestone |
| NFT tracking | Non-fungible asset model; not a sovereign risk instrument | Not applicable |
| Portfolio performance vs BTC/ETH benchmark | Feature creep; this is a sovereign risk tool, not a trading terminal | Keep EUR total return focus |

---

## Feature Dependencies

```
coin_symbol field
  → crypto_spot_prices table       (symbol lookup for XMR etc.)
  → gold-backed valuation path     (PAXG/XAUT: symbol used for display; XAU spot used for value)

sub_class = 'gold' on crypto asset
  → gold-backed valuation path     (conditional branch in valuation logic)
  → gold oz equivalent display     (differentiator)
  → combined gold exposure summary (differentiator)

custody_type field
  → custody risk indicator badge   (differentiator)
  → LocationsPage custody display  (differentiator)

computed value derivation
  → Dashboard net worth tile
  → Ledger value column
  → Analytics allocation data
  → Tier 3 allocation calculation
```

---

## MVP Recommendation

Build in this order:

1. **`coin_symbol` + `coin_name` + `custody_type` on assets** — DB migration only; enables everything else
2. **`crypto_spot_prices` table + manual entry UI** — parallels v1.2 metals spot UX; low effort
3. **Gold-backed token valuation** (PAXG/XAUT → XAU spot path) — unique to this dashboard; key correctness win
4. **Computed value propagation** — Dashboard, Ledger, Analytics, Tier
5. **Gold oz equivalent display + combined gold summary** — high value, low effort differentiators

Defer to v1.4+:
- Network/chain field
- Contract address storage
- Custody risk indicator badge (unless it's just CSS on fields already present)

---

## What Precious Metals + Crypto Users Expect

Based on portfolio profile (Dutch physical gold/silver/platinum → adding XMR, PAXG, XAUT):

1. **Quantity precision matters.** User expects to see "14.75 XMR @ €127.40 = €1,879.15", not just "€1,879". Physical metals users are trained on weight precision; the same expectation transfers directly to crypto.

2. **PAXG/XAUT should feel like gold, not like bitcoin.** They were purchased as a gold exposure instrument. Surfacing them under gold oz equivalent rather than in a crypto token pile aligns with the user's mental model and sovereign risk framing.

3. **Custody classification is table stakes for this audience.** A user who tracks whether their gold is at a Swiss vault vs. home vs. ABN AMRO will absolutely want to know whether their XMR is on Kraken vs. a Ledger. The sovereign risk theme demands it.

4. **Spot prices entered manually, used everywhere.** Consistent with established metals UX (v1.2). No expectation of live feeds; a 24-hour-old XMR price is fine for a wealth overview tool, not a trading terminal.

---

## Sources

- PAXG mechanics: https://paxos.com/paxg/ — HIGH confidence (official Paxos issuer page)
- XAUT mechanics: https://gold.tether.to/ — HIGH confidence (official Tether Gold page)
- Wallet custody taxonomy: consistent across CoinTracker, Koinly, Rotki, Delta, Ledger Live — MEDIUM confidence (industry convergence)
- Codebase analysis (direct read): `migrations/004_assets.ts`, `migrations/005_acquisitions.ts`, `migrations/009_asset_subclass.ts`, `migrations/015_asset_brand.ts`, `migrations/003_asset_locations.ts`, `frontend/src/types.ts` — HIGH confidence
