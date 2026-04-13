---
phase: 15
slug: sovereign-tier-system
status: retroactive
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 15 — Validation Strategy

> Retroactively reconstructed from codebase (TierPage.tsx, AssetModal.tsx). Phase was shipped via direct commit `feat(phase-15)` without GSD documentation workflow. No PLAN.md or SUMMARY.md exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — curl + tsc --noEmit only |
| **Config file** | none |
| **Quick run command** | `cd frontend && npx tsc --noEmit` |
| **Full suite command** | `cd frontend && npx tsc --noEmit && curl -s http://localhost:4001/api/tier-config` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After task commit:** `cd frontend && npx tsc --noEmit`
- **After tier-config route changes:** `curl http://localhost:4001/api/tier-config`
- **Before verification:** Full tsc must be clean + 4 tier-config rows returned

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-0x-01 | n/a | 1 | TIER-01 | tsc | `cd frontend && npx tsc --noEmit` | ✅ | ✅ green |
| 15-0x-02 | n/a | 1 | TIER-02 | manual+tsc | `grep "crypto" frontend/src/components/modals/AssetModal.tsx` | ✅ | ✅ green |
| 15-0x-03 | n/a | 1 | TIER-03 | curl | `curl -s http://localhost:4001/api/tier-config` | ✅ | ✅ green |
| 15-0x-04 | n/a | 1 | TIER-04 | manual | See manual-only below | n/a | ✅ green |

---

## Wave 0 Requirements

*No test framework — no stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tier assignment in AssetModal | TIER-01 | UI interaction | 1. Edit any asset. 2. "Sovereign Tier" select shows options: Unassigned, Tier 0–3. 3. Select Tier 2. 4. Save. 5. Reopen — Tier 2 must be persisted. |
| Tier 0 validity (not null-checked) | TIER-01 | Edge case | 1. Assign Tier 0 to an asset. 2. Verify TierPage counts it in Tier 0 allocation, not as unassigned. |
| Crypto asset creation and Tier 3 assignment | TIER-02 | UI interaction | 1. Add new asset with `asset_class = crypto`. 2. Assign Tier 3. 3. Verify it appears in TierPage under Tier 3 allocation. |
| Crypto — no weight field shown | TIER-02 | UI interaction | 1. Create/edit crypto asset. 2. Confirm weight_per_unit fields are NOT visible (precious_metals-only). |
| TierPage shows 4 tiers (T0–T3) | TIER-03, TIER-04 | UI | 1. Open Tier System page. 2. All 4 tiers displayed: Grid-Down Baseline, Digital Liquidity, The Vaults, Uncensorable Frontier. |
| Configure target/min/max per tier | TIER-03 | UI interaction | 1. On TierPage, click target_pct field for Tier 2. 2. Change from default to 40. 3. Tab/blur → value saves via PUT /api/tier-config/2. 4. Refresh — value persists. |
| Allocation bar and status badge | TIER-04 | Visual + logic | 1. Assign assets to tiers with known values. 2. Open TierPage. 3. Current % shown in range bar. 4. StatusBadge: green if min≤current≤max, amber if distance≤5%, red if distance>5%. |
| Asset list accordion per tier | TIER-04 | UI | 1. Assign 2 assets to Tier 2. 2. Open TierPage. 3. Chevron expands asset list under Tier 2. 4. Both assets shown with name + value. |
| TypeScript clean compile | All | Compile-time | `cd frontend && npx tsc --noEmit` → exits 0. |
| tier-config API returns 4 rows | TIER-03 | curl | `curl -s http://localhost:4001/api/tier-config \| python3 -c "import sys,json; tc=json.load(sys.stdin); assert len(tc)==4"` |

---

## Validation Sign-Off

- [x] All TIER-01 through TIER-04 behaviors have manual verification steps
- [x] Tier 0 edge case (valid = 0, not null) included
- [x] Tier config persistence via API blur included
- [x] TypeScript compilation check included
- [ ] `nyquist_compliant: true` — pending: no automated test coverage (no framework available)

**Approval:** retroactive audit 2026-04-13
