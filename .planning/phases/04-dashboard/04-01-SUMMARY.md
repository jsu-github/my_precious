# Phase 04-01 Summary — Dashboard Page

## Objective
Build the Dashboard page: net worth hero, asset allocation breakdown, vault security status.

## Artifacts Modified
- `frontend/src/pages/DashboardPage.tsx` — full implementation (replaces Phase 3 stub)

## Implementation
- Fetches `api.assets.list()` + `api.locations.list()` in parallel on mount
- `filteredAssets` memo filters by `entity_type` matching `entityFilter` prop
- `totalValue`, `byAssetClass`, `locationStats` all derived from filteredAssets (no additional API calls)
- `byAssetClass` sorted by value descending; bars use `width: ${pct}%`
- Vault security shows `custodian_name`, pulse dot, asset count, last_audit_date, location total
- `formatCurrency()` uses $xM / $xK shorthand for large values; tabular-nums on all financial figures

## Key Types Used
- `Asset` (with joined `entity_type`, `location_id`, `last_audit_date`)
- `AssetLocation` (showing `custodian_name`, `name`)
- `EntityFilter` from `layouts/AppShell`

## Verification
- Frontend container running, Vite HMR clean
- API returns 200 from /api/dashboard/summary
- Entity toggle (Personal/Business/Global) filters the displayed total client-side
