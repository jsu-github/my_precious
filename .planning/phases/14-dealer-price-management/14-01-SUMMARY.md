---
phase: 14
plan: 01
subsystem: frontend/modals
tags: [ui, dealer, modal, redesign]
dependency_graph:
  requires: [13-01, 13-02]
  provides: [dealer-modal-v2]
  affects: [LedgerPage, DealerManagementModal]
tech_stack:
  added: []
  patterns: [split-panel, catalog-view, tabbed-price-cards]
key_files:
  created: []
  modified:
    - frontend/src/components/modals/DealerManagementModal.tsx
    - frontend/src/components/modals/Modal.tsx
decisions:
  - Used -mx-6 -my-5 negative margin breakout + overflow-hidden on Modal.tsx outer container to achieve full-bleed split panel within existing Modal component
  - Add form shows only name+contact (no price tabs) — prices added after saving
  - key={String(selectedId)} on DealerCatalogPanel — re-mounts panel on dealer change, cleanly resets all internal state
metrics:
  duration_minutes: 15
  completed_date: "2026-04-11"
  tasks_completed: 4
  files_changed: 2
---

# Phase 14 Plan 01: Dealer Modal Redesign — Split-Panel Catalog Layout Summary

**One-liner:** Split-panel catalog modal with dealer sidebar, tabbed metal price cards (text-3xl), freshness coloring, and metal-specific dot indicators — replacing the cramped expand-in-place form pattern.

## What Was Built

Completely replaced `DealerManagementModal.tsx` (319 lines) with a new split-panel implementation (510 lines). The modal now has two zones:

1. **`DealerSidebar`** (w-52, left panel) — search input, scrollable dealer list with gold left-border selection indicator, primary price badge per dealer, "+ Add Dealer" button in footer

2. **`DealerCatalogPanel`** (flex-1, right panel) — contextual rendering based on mode:
   - `loading` → spinner
   - `add` → frictionless add form (name + contact notes only)
   - no dealer selected → `Building2` icon empty state
   - `view` / `edit` → 5-tab metal catalog with `MetalPriceCard` components

3. **`MetalPriceCard`** — view mode: `text-3xl font-mono` price display with dashed border placeholder when no price; edit mode: same card with inline `<input>` replacing the price number

4. **Design details:**
   - `TAB_DOT_COLOR` — metal-specific indicator dots (yellow for Au, slate for Ag, violet for Pt/Pd)
   - `freshnessClass()` — green (≤1 day), neutral (≤7 days), `text-error/60` (stale >7 days)
   - Modal upgraded from `max-w-xl` → `max-w-2xl`

## Commits

| Hash | Description |
|------|-------------|
| 80f5868 | feat(14-01): redesign DealerManagementModal — split-panel catalog layout |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added `overflow-hidden` to Modal.tsx outer container**
- **Found during:** Task 1 (split-panel implementation)
- **Issue:** The `-mx-6 -my-5` negative margin breakout technique requires the parent container to have `overflow: hidden` to clip content to the `rounded-xl` border radius. Without it, the flex panel's content would visually escape the modal's rounded corners.
- **Fix:** Added `overflow-hidden` to the `glass-panel rounded-xl` div in `Modal.tsx`
- **Files modified:** `frontend/src/components/modals/Modal.tsx`
- **Commit:** 80f5868

## Self-Check: PASSED

- [x] `frontend/src/components/modals/DealerManagementModal.tsx` exists and contains `max-w-2xl`, `DealerSidebar`, `DealerCatalogPanel`, `MetalPriceCard`, `PRICE_TAB_META`, `TAB_DOT_COLOR`, `freshnessClass`, `Building2`, `text-3xl font-mono`, `border-dashed`
- [x] All CRUD operations wired: `api.dealers.create`, `api.dealers.update`, `api.dealers.delete`
- [x] `onDealersChanged()` fires on every mutation
- [x] TypeScript: zero errors across all frontend src
- [x] Commit 80f5868 exists
