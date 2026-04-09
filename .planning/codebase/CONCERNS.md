# CONCERNS.md — Technical Debt, Risks & Issues

## Status: Pre-Implementation

No application code exists. Concerns listed here are **pre-implementation risks** identified from the PRD, design system, and architectural specification — not bugs in existing code.

---

## Critical: Requirements Contradictions

### 1. Port Number Inconsistency
**Risk:** High — will break Docker Compose wiring on first run
- `PRD.md` (Section 6): API port = `3040`
- `.github/copilot-instructions.md`: API port = `3001`
- **Action required:** Agree on a single port and enforce it everywhere before implementation

### 2. Live Price Feeds vs. Manual Entry
**Risk:** High — affects data model design
- `PRD.md` (Section 4.3): Specifies live market price feeds (precious metals spot, crypto exchange APIs, equity market data)
- `.github/copilot-instructions.md` (v1 Constraints): "No live price feeds — all asset values are entered manually"
- **Impact:** If live feeds are in scope, the data model needs a `PriceFeed` entity and scheduled refresh logic. If manual, prices are just stored values. These are fundamentally different designs.
- **Action required:** Explicit decision before data model implementation

---

## Architecture Risks

### 3. No Router Library — Navigation Complexity at Scale
**Risk:** Medium
- 6 screens now, potential for more via backlog. Discriminated union `View` state in `App.tsx` scales poorly beyond ~8–10 pages.
- Deep-linking and browser back/forward won't work without router integration.
- The constraint is intentional (per instructions) but will become painful if the app grows.

### 4. All Types in One File
**Risk:** Medium (long-term)
- `frontend/src/types.ts` as the single source of truth is clean in a small app but will grow unwieldy across 7+ entities with multiple input/update shapes.
- No concern right now; will become friction when the file exceeds ~500 lines.

### 5. No Auth — Any Request Is Trusted
**Risk:** Low for single-user local tool; High if ever exposed externally
- By design for v1 (personal tool), but the absence of auth means any network-reachable client can mutate all data.
- If Docker is ever run with external port exposure, there is zero protection.
- **Note:** The PRD mentions "private, self-hosted" — the risk is understood and accepted.

---

## Data Model Gaps

### 6. Missing: Price History / Valuation Snapshots
The PRD requires:
- P&L at acquisition-batch level: `current value - cost basis`
- Time-series performance charts

Without a `ValuationSnapshot` or `PriceHistory` entity, "current value" is just a manually-entered field with no historical curve. Performance charts need point-in-time snapshots to render.

### 7. Missing: Audit Trail Detail
PRD Section 4.5 specifies audit timestamps per asset + global audit timestamp. The data model sketch in PRD lists `Location.audit_config` but no dedicated `AuditEvent` entity. If audit events need to be logged (who, when, what changed), this needs a table.

### 8. Compliance Score Algorithm Undefined
PRD Section 3.5 says "Compliance Score: Real-time score (percentage) reflecting completeness of fiscal tagging across all assets. Targets `Optimal`." 
No formula is defined for the score. Is it `fiscal_tagged_assets / total_assets`? Does each asset class have different weight? Needs specification before implementation.

---

## Design System Risks

### 9. Stitch Mockups Use CDN Tailwind — Tokens Will Drift
The `.stitch/screens/*.html` mockups use Tailwind Play CDN with inline config. When the production app uses the same tokens via Vite-bundled Tailwind, any updates to `midnight-sovereign.json` must be manually synced to `tailwind.config.ts`. Risk of visual divergence over time.

### 10. Glassmorphism Performance on Large Data Tables
PRD prescribes `backdrop-filter: blur(24px)` for floating elements. This CSS property causes GPU compositing layer creation and can degrade scroll performance when applied near large financial tables (e.g., the Transaction Ledger with 100+ rows). Needs testing on target hardware.

### 11. Newsreader Font Loading — FOUT Risk
Newsreader is a variable serif used for large headline portfolio totals. Without `font-display: swap` and preloads, the initial paint will show fallback font causing a visible flash of unstyled text (FOUT) on the most prominent data point (total net worth value). Requires `<link rel="preload">` configuration in Vite.

---

## Empty Data Directories — Unclear Purpose

### 12. `data/import/` Has No Defined Schema
The `data/import/` directory exists but has no documentation of:
- What file formats are expected (CSV, JSON?)
- What entities can be bulk-imported
- Whether an import pipeline is in scope for v1

---

## Scope Creep Risks (PRD vs. Instructions)

The PRD is substantially more ambitious than the `copilot-instructions.md` describes:
- PRD implies live price feeds, interactive world maps, growth sparklines, compliance score algorithms
- Instructions describe a simpler sovereign risk tracking tool with manual values

Both documents are authoritative and diverge. Planning phases should explicitly resolve which PRD features are in scope for initial implementation vs. deferred.
