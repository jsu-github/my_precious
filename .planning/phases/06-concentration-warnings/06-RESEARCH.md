# Phase 6: Concentration Warnings — Research

**Phase:** 06-concentration-warnings
**Researched:** 2026-04-02
**Status:** Complete

---

## TL;DR for Planner

This phase is LOW complexity. The core concentration computation already exists in `GET /api/tags/overview`, which calculates `portfolio_pct` per tag via a JOIN on `assets → asset_tags → tags`. Warnings are simply tag overview rows filtered by a threshold. Two plans: (1) API warnings endpoint + threshold persistence, (2) DashboardPage warning section UI.

---

## Codebase Findings

### What Already Exists

**`GET /api/tags/overview`** — computes exactly what warnings need:
```ts
// Already returns per tag:
{ tag_id, tag_name, asset_count, combined_value, portfolio_pct, assets[] }
```
The `portfolio_pct` field is the concentration percentage. Warnings = `tags/overview` filtered by `portfolio_pct >= threshold`.

**`_schema_info` table** — already exists (migration 001), is a simple key-value store:
```ts
table.string('key').primary();
table.string('value').notNullable();
```
Use `key = 'concentration_threshold'`, `value = '70'` for threshold persistence. No new migration needed.

**`portfolioRouter`** (`api/src/routes/portfolio.ts`) — already mounted at `/api/portfolio`. Add warnings + threshold endpoints here.

**`DashboardPage.tsx`** — existing structure:
1. Header row (back button + title + refresh)
2. Error block
3. Loading / empty state
4. _(insert warning section here)_
5. 4-column MetricCard grid
6. 2-column charts section

Warning section must go after the header row, before the metrics strip — per UI-SPEC.

**`api.portfolio.summary()`** in `api.ts` — pattern for adding new portfolio methods.

**`PortfolioSummary` in `types.ts`** — pattern for new types.

---

## Architecture Decision

### Threshold Storage: `_schema_info` table

✓ Already exists — no migration
✓ Survives container restart
✓ Single source of truth on backend

Default: `70` (matching WARN-01 spec requirement)

### API Surface

**New endpoints on `portfolioRouter`:**

```
GET  /api/portfolio/warnings          → ConcentrationWarning[] (uses stored threshold)
GET  /api/portfolio/threshold         → { threshold: number }
PUT  /api/portfolio/threshold         → { threshold: number } body → { threshold: number }
```

**Response shape for `GET /api/portfolio/warnings`:**
```ts
interface ConcentrationWarning {
  tag_id: string;
  tag_name: string;
  portfolio_pct: number;       // e.g., 73.5
  combined_value: number;
  asset_count: number;
  severity: 'amber' | 'red';   // amber: threshold–89.99%, red: 90%+
  assets: Array<{
    id: string;
    name: string;
    value: number;
    pct: number;               // this asset's share of the total portfolio
  }>;
}
```

**Why severity on the API?** Keeps the threshold-to-severity mapping logic server-side. Frontend just reads `severity` and applies the right color from UI-SPEC.

### SQL for Warnings Endpoint

Reuses the same JOIN pattern from `tags/overview`:

```sql
WITH portfolio_total AS (
  SELECT COALESCE(SUM(value), 0) AS total FROM assets
)
SELECT
  t.id AS tag_id,
  t.name AS tag_name,
  COUNT(DISTINCT at.asset_id)::int AS asset_count,
  SUM(a.value)::float AS combined_value,
  ROUND((SUM(a.value) / NULLIF(pt.total, 0) * 100)::numeric, 2)::float AS portfolio_pct
FROM tags t
JOIN asset_tags at ON t.id = at.tag_id
JOIN assets a ON at.asset_id = a.id
CROSS JOIN portfolio_total pt
GROUP BY t.id, t.name, pt.total
HAVING SUM(a.value) / NULLIF(pt.total, 0) * 100 >= :threshold
ORDER BY portfolio_pct DESC
```

Then per warning, fetch the contributing assets in a second query (or use JSON_AGG).

---

## Frontend Architecture

### DashboardPage Changes

Add alongside `data` state:
```ts
const [warnings, setWarnings] = useState<ConcentrationWarning[]>([]);
const [threshold, setThreshold] = useState<number>(70);
const [thresholdInput, setThresholdInput] = useState<string>('70');
```

Fetch warnings + threshold alongside `api.portfolio.summary()` in `fetchData`:
```ts
Promise.all([
  api.portfolio.summary(),
  api.portfolio.warnings(),
  api.portfolio.getThreshold(),
]).then(([summary, warns, thresh] => { ... })
```

Debounce threshold changes (300ms) to re-fetch warnings without persisting. On blur, persist via `api.portfolio.setThreshold(value)`.

### WarningCard Component

A small presentational component in `components/WarningCard.tsx`:
- Props: `warning: ConcentrationWarning`
- Renders the left-accent card from UI-SPEC (amber vs red based on `severity`)
- The DashboardPage imports and maps over `warnings`

### No New Page

Warnings render inline on `DashboardPage`. No routing change needed in `App.tsx`.

---

## No Migration Needed

`_schema_info` already exists. The threshold is just an INSERT/UPDATE on that table:
```ts
await db('_schema_info')
  .insert({ key: 'concentration_threshold', value: String(threshold) })
  .onConflict('key').merge();
```

---

## Dependency on Existing Code

| File | What We Depend On |
|------|-------------------|
| `api/src/routes/portfolio.ts` | Add to existing `portfolioRouter` |
| `api/src/routes/tags.ts` | SQL pattern to copy (no functional change) |
| `frontend/src/api.ts` | Add `portfolio.warnings()`, `portfolio.getThreshold()`, `portfolio.setThreshold()` |
| `frontend/src/types.ts` | Add `ConcentrationWarning` interface |
| `frontend/src/pages/DashboardPage.tsx` | Insert warning section, add state |

No new routes need to be mounted in `index.ts` — all new endpoints go under the existing `/api/portfolio` mount.

---

## Complexity Assessment

| Concern | Level | Notes |
|---------|-------|-------|
| SQL complexity | Low | Straightforward GROUP BY + HAVING on existing tables |
| Migration | None | `_schema_info` already exists |
| New routes | Low | 3 endpoints added to existing router |
| Frontend | Low | 1 new component + DashboardPage extension |
| Risk | Low | All data already available in existing endpoints |

**Estimate:** 2 plans, Wave 1 (API) → Wave 2 (Frontend).

---

## Plans Recommended

**Plan 01 — API: Concentration warnings endpoint + threshold persistence**
- Add `GET /api/portfolio/warnings`, `GET /api/portfolio/threshold`, `PUT /api/portfolio/threshold` to `portfolio.ts`
- Seed default threshold (70) in `_schema_info` on first call if not present
- Add `ConcentrationWarning` type to `types.ts` + `api.portfolio.*` methods to `api.ts`

**Plan 02 — Frontend: DashboardPage warning section**
- Create `components/WarningCard.tsx` (left-accent card, amber/red severity)  
- Extend `DashboardPage.tsx`: fetch warnings + threshold, render warning section above metrics strip, inline threshold input with debounce + blur-persist

## RESEARCH COMPLETE
