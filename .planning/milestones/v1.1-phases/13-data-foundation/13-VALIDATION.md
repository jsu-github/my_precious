---
phase: 13
slug: data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | curl + tsc --noEmit (no test runner needed — pure infrastructure phase) |
| **Config file** | none |
| **Quick run command** | `cd frontend && npx tsc --noEmit && cd ../api && npx tsc --noEmit` |
| **Full suite command** | same as quick — no test suite for this phase |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx tsc --noEmit`
- **After Wave 1 (migrations):** `curl localhost:3001/api/dealers` and `curl localhost:3001/api/tier-config`
- **After Wave 2 (types + api.ts):** `cd frontend && npx tsc --noEmit` (must be zero errors)
- **Final gate:** All curl checks below pass + zero TypeScript errors in both frontend and api

---

## Validation Checklist

### Migration 010 — dealers table
- [ ] `grep -r "dealers" api/migrations/` → shows `010_dealers.ts`
- [ ] `grep "we_buy_gold_per_gram" api/migrations/010_dealers.ts` → shows `decimal(col, 10, 4)`
- [ ] `curl localhost:3001/api/dealers` → returns `[]` (empty array, 200 OK)
- [ ] POST to `/api/dealers` with `{"name":"Test Dealer"}` → returns object with `id`

### Migration 011 — assets columns + tier_config
- [ ] `grep "weight_per_unit_grams" api/migrations/011_tier_system.ts` → present
- [ ] `grep "tier_config" api/migrations/011_tier_system.ts` → present
- [ ] `curl localhost:3001/api/tier-config` → returns exactly 4 rows with `tier_id` 0–3
- [ ] `curl localhost:3001/api/assets` → response objects include `weight_per_unit_grams` and `tier` keys (null values expected for existing assets)

### ledger.ts SELECT list
- [ ] `grep "weight_per_unit_grams" api/src/routes/ledger.ts` → present
- [ ] `curl localhost:3001/api/ledger` → rows include `weight_per_unit_grams` key

### routes/index.ts
- [ ] `grep "dealersRouter\|tierConfigRouter" api/src/routes/index.ts` → both present
- [ ] `grep "'/dealers'\|'/tier-config'" api/src/routes/index.ts` → both mount paths present

### types.ts
- [ ] `grep "Dealer\|TierConfig" frontend/src/types.ts` → both interfaces present
- [ ] `grep "weight_per_unit_grams\|tier:" frontend/src/types.ts` → present in Asset AND LedgerRow

### api.ts
- [ ] `grep "dealers:\|tierConfig:" frontend/src/api.ts` → both namespaces present

### Sidebar.tsx / App.tsx (View union atomicity)
- [ ] `grep "'tier'" frontend/src/components/Sidebar.tsx` → View union includes `'tier'`
- [ ] `grep "case 'tier'" frontend/src/App.tsx` → stub case exists in renderPage()
- [ ] No actual TierPage import in App.tsx yet (that's Phase 15) — stub returns `<div />`

### TypeScript compile
- [ ] `cd frontend && npx tsc --noEmit` → exits 0
- [ ] `cd api && npx tsc --noEmit` → exits 0
