---
phase: 14
slug: dealer-price-management
status: retroactive
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 14 — Validation Strategy

> Retroactively reconstructed from SUMMARY.md and codebase. Phase was shipped directly without GSD documentation workflow.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — curl + tsc --noEmit only |
| **Config file** | none |
| **Quick run command** | `cd frontend && npx tsc --noEmit` |
| **Full suite command** | `cd frontend && npx tsc --noEmit && cd ../api && npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After task commit:** `cd frontend && npx tsc --noEmit`
- **After each plan wave:** `curl http://localhost:4001/api/dealers` + tsc check
- **Before `/gsd-verify-work`:** Full tsc must be clean + all curl checks pass

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | MKTD-01, MKTD-02 | manual+tsc | `cd frontend && npx tsc --noEmit` | ✅ | ✅ green |
| 14-01-02 | 01 | 1 | MKTD-01 | manual | See manual-only below | n/a | ✅ green |
| 14-01-03 | 01 | 1 | MKTD-01 | manual | See manual-only below | n/a | ✅ green |
| 14-01-04 | 01 | 1 | MKTD-01 | manual | See manual-only below | n/a | ✅ green |
| 14-0x-01 | ledger | 1 | DATA-01, MKTD-03 | manual+curl | `curl -s http://localhost:4001/api/ledger \| python3 -c "import sys,json; r=json.load(sys.stdin); print('weight_per_unit' in r[0] if r else 'empty')"` | ✅ | ✅ green |

---

## Wave 0 Requirements

*No test framework — no stubs needed. All verification is runtime or manual.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dealer CRUD via DealerPage split-panel | MKTD-01 | UI interaction — no E2E framework | 1. Navigate to Dealer page. 2. Create dealer "Test Gold Bank". 3. Verify it appears in sidebar. 4. Edit name. 5. Delete. |
| Set We Buy price per metal type | MKTD-02 | UI interaction | 1. Create a dealer. 2. Switch to gold tab. 3. Enter `€54.00/g` for Gold Bar. 4. Confirm freshness indicator shows "today". |
| Dealer price selector in Ledger | MKTD-03 | UI interaction | 1. Open Ledger. 2. Dealer dropdown shows only dealers with at least one price set. 3. Select dealer — "Liq. Value" column appears. 4. Formula: qty × weight_g × rate. |
| Weight field visible only for precious_metals | DATA-01 | UI interaction | 1. Open AssetModal for a precious metal asset. Confirm `weight_per_unit` + `weight_unit` fields are visible. 2. Open for a crypto asset — fields must NOT appear. |
| Liquidation value computation | MKTD-03 | Browser+API | 1. Asset: 10 oz bar, weight_per_unit=1, weight_unit=oz. 2. Dealer: €54/g. 3. Expected liq value: 10 × 31.1035 × 54 = €16,795.89. 4. Verify column shows correct value. |
| Liq. Value profit/loss coloring | MKTD-03 | UI interaction | 1. Set dealer price above cost basis → value shows in emerald-600. 2. Below cost basis → shows in red-500. |
| TypeScript clean compile | All | Compile-time | `cd frontend && npx tsc --noEmit` → exits 0. |

---

## Validation Sign-Off

- [x] All DATA-01, MKTD-01/02/03 behaviors have manual verification steps
- [x] Formula verification included (MKTD-03 troy-oz → gram conversion)
- [x] TypeScript compilation check included
- [ ] `nyquist_compliant: true` — pending: no automated test coverage (no framework available)

**Approval:** retroactive audit 2026-04-13
