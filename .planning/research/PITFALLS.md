# Pitfalls Research

**Domain:** React + Express + PostgreSQL local dashboard with custom dark design system
**Researched:** April 9, 2026
**Confidence:** HIGH (all pitfalls derived from actual screen analysis, design system spec, and stack knowledge)

---

## Critical Pitfalls

### P1: Tailwind CSS Token Drift — CDN vs. Bundled

**Description:** All 6 `.stitch/screens/*.html` files use Tailwind via CDN Play (`<script src="https://cdn.tailwindcss.com">`). The custom token extension is defined inline in `<script id="tailwind-config">` in each HTML file. When porting to production Vite + Tailwind build, these tokens must be manually extracted into `tailwind.config.ts` — any token name mismatch causes silent fallback to default Tailwind values (white backgrounds, generic blues).

**Risk:** HIGH — pure CSS failure; no runtime error; extremely hard to spot in dark-mode-only apps

**Specific tokens to verify match:**
```
bg-surface                → #0b1326
bg-surface-container-low  → #131b2e
bg-surface-container-high → #222a3d
text-primary              → #e9c349  (gold)
text-secondary            → #4edea3  (emerald)
text-tertiary             → #b9c7e0  (slate)
border-outline-variant    → #45464d
text-on-surface-variant   → #c6c6cd
```

**Mitigation:**
1. Extract `midnight-sovereign.json` token values into `tailwind.config.ts` during project setup
2. Write smoke test: render one of each key class; assert computed background-color matches hex

---

### P2: Floating-Point Errors in Financial Data

**Description:** Using JavaScript `number` type or PostgreSQL `FLOAT`/`DOUBLE` for monetary values causes rounding errors in calculations. A portfolio totaling millions of dollars will accumulate visible errors on screen (e.g., $142,850,001.03 instead of $142,850,000.00).

**Risk:** HIGH — silently wrong numbers in a wealth management tool destroys user trust

**Affected calculations:**
- Net worth total (sum of all `current_value`)
- P&L calculation (`current_value - cost_basis`)
- Allocation percentages (especially when values exceed 1M)

**Mitigation:**
1. **PostgreSQL:** All monetary columns use `NUMERIC(20, 2)` — never `FLOAT` or `DOUBLE PRECISION`
2. **API layer:** Return monetary values as strings; use `pg-decimal` or BigDecimal for arithmetic
3. **Frontend:** Format with `Intl.NumberFormat` — never do arithmetic on displayed values
4. **Alternative:** Return cents as integers from API; display layer divides by 100

---

### P3: `backdrop-filter: blur()` Performance on Tables

**Description:** The `.glass-panel` utility is used heavily: hero cards, map tooltips, modal overlays, sidebar. `backdrop-filter: blur(24px)` triggers GPU composite layer creation on every element. Applying this on table row containers (if someone adds `glass-panel` to a 200-row table) can cause visible frame drops on integrated GPUs.

**Specific risk location:** `.stitch/screens/transaction-ledger/` — if `glass-panel` is applied to the outer table wrapper

**Mitigation:**
1. Reserve `glass-panel` for **overlay elements only**: hero panels, modals, sidebar background, map tooltips
2. Table containers must use `bg-surface-container-low` (opaque) — never `glass-panel`
3. Confirm `bg-[#0b1326]/70 backdrop-blur-xl` in the top header is acceptable (single element, not repeated per row)

---

### P4: API Port Conflict (PRD vs copilot-instructions)

**Description:** `PRD.md` specifies the API at port `3040`. `copilot-instructions.md` specifies `:3001`. If these are not harmonized before wiring Docker Compose, `docker compose up` will start the API on one port while the frontend `VITE_API_URL` points to the other — silent failures, no CORS error (same origin via proxy).

**Risk:** MEDIUM — caught early in first E2E test, but causes confusion during setup

**Resolution:** Use `:3001` (copilot-instructions is the active development spec). Update `PRD.md` to reflect this.

---

### P5: Newsreader Font FOUT (Flash of Unstyled Text)

**Description:** Newsreader is used for all `font-headline` elements across all 6 screens: page titles (`text-4xl`/`text-5xl`), portfolio totals, the "The Vault" sidebar wordmark. On first load, before Google Fonts CDN delivers the font, page titles briefly render in system serif (fallback). This is most visible on the Dashboard hero and page headers — prominent high-weight text at large sizes.

**Risk:** MEDIUM — visual polish issue only; no functional impact

**Mitigation options:**
1. **`font-display: swap` + preconnect hint** (simplest):
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   ```
2. **Self-host fonts** in `frontend/public/fonts/` (best FOUT elimination):
   Download Newsreader WOFF2 → serve locally → add `@font-face` in `index.css`
3. **CSS size-adjust** to make fallback font match Newsreader's proportions

**Recommendation:** Self-host for production; preconnect hint for v1 development.

---

### P6: React Re-render on Every Entity Toggle

**Description:** The entity toggle (Personal/Business/Global) stored in `App.tsx` state passes all the way down to all 6 pages. Without memoization, every toggle change re-renders the entire page tree — including expensive data table renders with large acquisition lists.

**Risk:** MEDIUM — perceptible lag on slower hardware with full datasets

**Mitigation:**
1. Wrap all page components in `React.memo()`
2. Pass `entity` prop from `App.tsx` directly through `AppShell` — do NOT store a copy in page state
3. Use `useMemo` for filtered/sorted data derivations within each page
4. API calls should be parameterized by entity: `api.assets.list({ entity: 'personal' })` — not fetch-all-then-filter

---

### P7: Excel Import Column Mapping Brittleness

**Description:** SheetJS parses Excel to JSON with column headers as object keys. If the user's Excel column headers differ from expected names (e.g., "Asset Name" vs "asset_name" vs "Name"), the import silently produces empty fields or fails.

**Risk:** MEDIUM — user's entire existing data could fail to import

**Mitigation:**
1. Implement column mapping UI: show user a dropdown for each expected field mapping to their actual column names
2. Fallback: document the expected template format; provide a downloadable template Excel
3. Validate before insert: check required fields exist; return `{ errors: [] }` array per-row

---

### P8: World Map Pin Position Hardcoding

**Description:** The `.stitch/screens/asset-locations-inventory/` screen uses absolutely-positioned `<div>` pins with hardcoded percentage positions. If these positions are baked in as static values, adding new custodian locations requires a developer code change.

**Risk:** MEDIUM — UX limitation, not a bug

**Mitigation:**
1. Store `map_x_pct` and `map_y_pct` in `asset_locations` table (see data model)
2. Render pins dynamically from CRUD-editable location records
3. Admin: provide a drag-to-position interface for new locations, or default to country centroid lookup

---

### P9: Missing `ValuationSnapshot` Entity

**Description:** The PRD describes "valuation history" to power performance charts. The current data model has `assets.current_value` (a single point-in-time value) but no time-series valuation history. Without snapshots, performance trending charts (e.g., net worth over 12 months visible in `.stitch/screens/performance-analytics/`) can only show current state.

**Risk:** MEDIUM-HIGH — analytics screen will be empty / non-functional without this

**Mitigation:**
1. Add `valuation_snapshots` table: `asset_id, recorded_at, value, notes`
2. Either: API triggers snapshot on every `PATCH /assets/:id/current_value`; or: user manually records periodic snapshots
3. Performance analytics pulls `SELECT recorded_at, SUM(value) GROUP BY recorded_at` for portfolio trend

---

### P10: Cross-Entity Transfer Double-Counting

**Description:** Assets transferred between Personal and Business entities should not appear in both entity totals simultaneously. Without careful handling, `SELECT SUM(current_value) WHERE entity_id = ?` returns inflated values if ownership transfer isn't applied atomically.

**Risk:** MEDIUM — incorrect net worth display

**Mitigation:**
1. "Transfer Funds" operation must atomically:
   - Decrement source entity asset value (or reassign `entity_id`)
   - Create a `transfers` record for audit trail
   - Increment destination entity asset value
2. Use a database transaction — no partial state possible
3. Add a `transfers` entity to the data model (already included in schema above)

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Tempting | Why It's Wrong |
|-------------|-------------------|----------------|
| `glass-panel` on table rows | "Looks premium" | GPU destruction; 200 blur layers = visual lag |
| Storing formatted currency strings in DB | "Makes display easy" | Kills arithmetic; kills sorting; `NUMERIC(20,2)` only |
| Importing page components into each other | "Convenient for cross-links" | Violates discriminated union navigation — creates circular deps |
| Using `<a href>` for in-app navigation | "Simplest approach" | Forces full page reload; use `onClick` + `onNavigateTo...` callbacks |
| Adding any 1px solid border for structure | "Standard table borders" | Violates Midnight Sovereign aesthetic; use surface nesting |
| Adding a UI library like Shadcn or MUI | "Speeds up development" | Foreign component model intrudes on custom design system; dark-mode conflicts |
| `Math.round()` on currency | "Good enough" | Not good enough — use `NUMERIC` all the way to display |
| Inline `fetch()` in component | "Quick to write" | Breaks api.ts centralization; makes error handling inconsistent |

---

## Positive Patterns to Follow

| Pattern | Where It Appears | Why |
|---------|-----------------|-----|
| `divide-y divide-outline-variant/10` for table rows | Ledger, Analytics | Zero-weight separators; pure Midnight Sovereign |
| `text-tnum` / `tabular-nums` on ALL financial figures | All screens | Prevents number column width from jittering on value changes |
| Atmospheric spotlight: `bg-primary/5 rounded-full blur-[120px]` | Business/Personal | Large-radius glow gives depth without blur perf cost — it's on background, not content |
| Glassmorphism **only** on overlay elements | All screens | Performance boundary respected in all 6 mockups |
| `hover:bg-surface-container-high/40` on table rows | Ledger | Subtle hover; no border or outline — stays in token system |
| Surface nesting for visual hierarchy | All screens | `surface-container-lowest` → `surface-container-low` → `surface-container-high` = depth w/o borders |

---

## Sources

- `.stitch/screens/*.html` — all 6 screens analyzed for pattern extraction
- `.stitch/design-system/DESIGN_SYSTEM.md` — explicit constraints documented
- `.stitch/design-system/midnight-sovereign.json` — exact token values
- `.github/copilot-instructions.md` — architectural constraints
- `.planning/codebase/CONCERNS.md` — initial concern triage (port conflict, FOUT, missing entities)

---
*Pitfalls research for: Precious Dashboard*
*Researched: April 9, 2026*
