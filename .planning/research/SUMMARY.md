# Research Summary

**Project:** Precious Dashboard — Unified Sovereign Wealth Command Center
**Summarized:** April 9, 2026
**Documents:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md

---

## What We're Building

A single-user, fully local, Docker-hosted financial dashboard for managing sovereign wealth across business and personal legal entities, multiple asset classes, and international jurisdictions. Six screens, designed in "Midnight Sovereign" dark aesthetic. Zero auth. Manual valuations only (v1).

---

## Stack Decision (Final)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React 18 + TypeScript + Vite 5 | Specified; confirmed by all 6 screen component patterns |
| Styling | Tailwind CSS + Midnight Sovereign tokens | All 6 screens use Tailwind; tokens in `midnight-sovereign.json` |
| Icons | Material Symbols Outlined (Google Fonts) | All 6 screens use this font |
| Fonts | Newsreader (serif headlines) + Inter (data/body) | Both fonts in all 6 screens |
| API | Node.js + Express + TypeScript | Specified; single-user local tool = no framework overhead |
| API Port | **:3001** (not :3040) | copilot-instructions is active spec; PRD has stale value |
| DB | PostgreSQL 16 + Knex.js | Specified; NUMERIC(20,2) for all money; auto-running migrations |
| Excel Import | SheetJS (xlsx) | User confirmed Excel format |
| Runtime | Docker Compose v2 | `make dev` starts everything |

---

## Feature Inventory

**6 screens fully specified in `.stitch/screens/`:**

| Screen | File | Primary Value |
|--------|------|---------------|
| Global Net Worth Dashboard | `global-net-worth-dashboard/` | Hero total + allocation breakdown |
| Transaction / Acquisition Ledger | `transaction-ledger/` | Tabular P&L with filters + export |
| Performance & Analytics | `performance-analytics/` | Batch-level ROI + market ticker |
| Asset Locations & Inventory | `asset-locations-inventory/` | Jurisdictional map + custody table |
| Tax & Compliance Center | `tax-compliance-center/` | Fiscal tagging + compliance score |
| Business vs. Personal Breakdown | `business-vs-personal-breakdown/` | Dual-ledger side-by-side |

**6 data entities required:**
- Entities (legal personas: Business / Personal)
- Assets (instruments with `current_value`, `asset_class`)
- Asset Locations (jurisdictional custodians; power world map pins)
- Acquisitions (purchase batches; power P&L and ledger)
- Fiscal Tags (compliance categorization; power Tax screen)
- Transfers (inter-entity movements; deferred UI, schema required)

**Plus:** Excel bulk import + in-app CRUD forms

---

## Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Navigation | Discriminated union `View` state in `App.tsx` | Required by copilot-instructions; confirmed — no router |
| Entity filter | `type Entity = 'personal' \| 'business' \| 'combined'` in App.tsx | Shared across all 6 pages; all screens show this toggle |
| Shared layout | `Sidebar.tsx` + `TopHeader.tsx` + `AppShell.tsx` | Identical chrome in all 6 HTML mockups |
| API error shape | `{ error: { message: string, status: number } }` | Required by copilot-instructions |
| Money storage | `NUMERIC(20, 2)` — never `FLOAT` | Precision requirement for trustworthy wealth data |
| Glassmorphism | **Only on overlay elements** (panels, modals, header) | Performance boundary: never on repeated list items |

---

## Key Design Patterns (from actual screens)

```
Active nav item:    border-l-2 border-[#e9c349] text-[#e9c349] bg-[#222a3d]/50
Top header:         bg-[#0b1326]/70 backdrop-blur-xl border-b border-[#45464d]/20
Glass panel:        background: rgba(34,42,61,0.7); backdrop-filter: blur(24px)
Gold gradient CTA:  background: linear-gradient(135deg, #e9c349 0%, #9d7d00 100%)
Table rows:         divide-y divide-outline-variant/10  (never 1px borders)
Financial figures:  tabular-nums / text-tnum  (always)
Status chips:       rounded-full bg-X-container/20 border border-X/20
Page title:         font-headline text-4xl/text-5xl font-semibold
Map pins:           w-4 h-4 bg-primary rounded-full animate-pulse + gold shadow
Atmospheric glow:   w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]
```

---

## Top 5 Pitfalls to Handle First

| # | Pitfall | Impact | Mitigation |
|---|---------|--------|-----------|
| 1 | Tailwind token drift (CDN in screens vs bundled prod) | Silent CSS failures | Copy all tokens from `midnight-sovereign.json` into `tailwind.config.ts` at project scaffold |
| 2 | Floating-point money errors | Wrong numbers on wealth display | `NUMERIC(20,2)` in all tables; no `float` anywhere in money path |
| 3 | `backdrop-filter` on tables/repeat elements | GPU lag on slow hardware | Glass panel = overlay elements only; tables use opaque surface tokens |
| 4 | Missing `valuation_snapshots` entity | Analytics charts empty | Include in initial schema even if UI is deferred |
| 5 | API port conflict | App won't connect on startup | Standardize on `:3001`; fix PRD reference |

---

## Implementation Phases (Recommended Sequence)

1. **Foundation** — Docker Compose + PostgreSQL + migrations + API skeleton
2. **Data model** — All entity migrations + CRUD endpoints + TypeScript types
3. **Shell** — React app scaffold + Tailwind tokens + AppShell (Sidebar + TopHeader)
4. **Dashboard** — Net worth hero + allocation panel (first visible value)
5. **Transaction Ledger** — Table + filters + P&L calcs + export
6. **Performance Analytics** — Batch P&L + market ticker component
7. **Asset Locations** — World map + inventory table + CRUD
8. **Tax & Compliance** — Fiscal tagging CRUD + compliance score
9. **Business vs. Personal** — Dual-column layout + entity comparison
10. **Excel Import** — File upload + SheetJS parsing + column mapping UI
11. **In-app CRUD forms** — Add/edit modals for all entities
12. **PWA** — manifest.webmanifest + installability

---

## Open Questions Before Roadmap

| Question | Default If No Answer |
|----------|---------------------|
| What columns does the user's Excel file actually have? | Provide column mapping UI; document template format |
| Are all currency values in USD, or are there multi-currency assets? | Store all in USD; currency selector is display-only |
| Should `valuation_snapshots` be user-entered or auto-triggered on value edit? | Auto-create snapshot when `current_value` is updated |
| Which are the user's actual jurisdictions/custodian names? | Pre-seed DB with locations shown in screens (Zurich CH, Singapore SG, Delft NL) |

---

*Research complete — ready for REQUIREMENTS.md and ROADMAP.md*
