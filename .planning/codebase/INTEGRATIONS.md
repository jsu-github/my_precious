# INTEGRATIONS.md — External Integrations

## Status: Pre-Implementation

No integration code exists. The integrations below are **specified** in the PRD or implied by the design mockups.

---

## Confirmed External Dependencies (Screen Mockups)

### Google Fonts (CDN)
Used in all 6 `.stitch/` screen mockups. Will be self-hosted or CDN-loaded in production.
- `Inter` (weights 300–700) — data and UI text
- `Newsreader` (optical-size, italic, weights 400–700) — headlines and portfolio totals
- `Material Symbols Outlined` — icon font (variable font, FILL axis 0–1)

### Tailwind CSS (CDN → bundled in production)
- Used via Play CDN in mockups (`cdn.tailwindcss.com?plugins=forms,container-queries`)
- Production: bundled via Vite + `@tailwindcss/forms` + `@tailwindcss/container-queries`

---

## Planned Integrations (Per PRD Section 4.3 — Real-Time Market Valuation)

> Note: PRD specifies live feeds; `.github/copilot-instructions.md` says "No live price feeds — all asset values are entered manually" as a v1 constraint. These are **deferred post-v1** unless requirements are clarified.

| Asset Class | Data Source | Notes |
|-------------|-------------|-------|
| Precious metals | External market data API (spot USD/oz) | Deferred (v1 manual) |
| Crypto assets | Exchange feed APIs | Deferred (v1 manual) |
| Public equities | Market data API | Deferred (v1 manual) |

---

## Database
- **PostgreSQL 16** — local Docker container, no external DB
- Connection via Knex.js ORM/query-builder
- Data volume: local only (`data/db/` mount path implied)

---

## No Current Integrations

The repository currently contains:
- `data/db/` — empty directory (DB mount point, no files)
- `data/import/` — empty directory (import staging, no files)

No API keys, webhooks, OAuth flows, or third-party service accounts are wired up.

---

## Export Features (PRD Section 4.6)

The application will generate exports but does not call external services:
- Ledger CSV/PDF export (local generation)
- Fiscal report generation (local generation)
- VAT documentation export (local generation)

These are local file-generation operations, not external integrations.
