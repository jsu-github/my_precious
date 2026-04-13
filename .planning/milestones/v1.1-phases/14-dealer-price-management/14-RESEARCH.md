# Phase 14 Research — Dealer Price Management (Modal Redesign)

## Context

User wants the DealerManagementModal completely redesigned to look like the **Holland Gold** buy/sell price catalog UI — category tabs with icons, product-row price display, and a visually striking layout — rather than the current heavy-form CRUD pattern.

---

## What The Reference Screenshot Tells Us

Holland Gold's UI (the inspiration) uses:

| Element                | Their implementation                   | Our equivalent                             |
|------------------------|----------------------------------------|--------------------------------------------|
| Category tabs          | Icon + label, pill border active state | Gold Bars / Gold Coins / Silver / Pt·Pd    |
| Sub-category pills     | Brand filter tags below tab row        | Not needed (we have product category, not brand) |
| Product rows           | Name · spread indicator · € price     | Dealer name · "X days ago" · we-buy €/g   |
| Price emphasis         | Large green Euro price right-aligned  | `€128.31/g` gold accent, right side        |
| Search bar             | Above tabs, full-width                 | For dealer list (search by name)           |

The key architectural shift: **change from form-first (fill in prices) to catalog-first (view prices, click to edit).**

---

## Standard Stack

**No new dependencies required.** Everything needed already exists:

- React controlled inputs (already used)  
- Lucide icons (`Building2`, `Coins`, `Layers`, `FlaskConical` for metal icons)  
- Tailwind CSS with existing design tokens (`--color-primary`, `--color-surface-high`, etc.)  
- `<Modal>` component from `Modal.tsx`  
- `api.dealers.*` (already implemented in Phase 13)

---

## Architecture Pattern: Split-Panel Catalog Modal

**Current:** Single-column dealer list, each row expands into a form inline.

**New: Two-zone layout inside the modal**

```
┌──────────────────────────────────────────────────────┐
│  MANAGE DEALERS                             [×]      │
├───────────────────┬──────────────────────────────────┤
│  DEALER LIST      │  PRICE CATALOG                   │
│  (left panel)     │  (right panel)                   │
│                   │                                  │
│  ● Holland Gold   │  [Gold Bars] [Coins] [Silver]…   │
│  ● Kitco          │  ─────────────────────────────── │
│  ● Umicore        │  We Buy — Gold Bars              │
│                   │  ╔═══════════════════════════╗   │
│  [+ New Dealer]   │  ║  €128.31 /g  Au bar      ║   │
│                   │  ╚═══════════════════════════╝   │
│                   │  Updated 2 days ago              │
│                   │  [Edit] [Delete]                 │
└───────────────────┴──────────────────────────────────┘
```

On mobile (narrow modal): left panel renders as a dropdown/select above the catalog panel.

---

## Component Structure

### `DealerManagementModal` (root)
- State: `dealers[]`, `selectedDealer: Dealer | null`, `editMode: boolean`, `addMode: boolean`
- Layout: `max-w-2xl`, flex row with `w-52` sidebar + `flex-1` catalog panel

### `DealerSidebar`
- Renders dealer list as compact cards
- Hover state highlights selected
- "+ New Dealer" button at bottom opens AddDealerForm in right panel
- Search input at top (filter by `dealer.name.toLowerCase()`)

### `DealerCatalogPanel`
- Empty state when no dealer selected: "Select a dealer to view prices"
- Loaded state: 5 tabs (Gold Bars / Gold Coins / Silver Bars / Silver Coins / Pt·Pd)
- Tab icons: use emoji or Lucide `Circle` (gold fill) — keep it simple
- Each tab shows one price card with:
  - Metal category label
  - Large euro price or `—` placeholder
  - % below spot badge (optional: compute if spot is available, show static for now)
  - "Updated X days ago" freshness badge
- Edit mode overlays input fields on the card in place (no separate edit form)

### `MetalPriceCard` (new sub-component)
```tsx
interface MetalPriceCardProps {
  label: string;
  price: string | null;
  hint: string;
  editing: boolean;
  value: string;
  onChange: (val: string) => void;
}
```
View mode: full-width card, price in `text-2xl font-mono text-primary`.  
Edit mode: card border turns `border-primary/60`, price becomes a controlled `<input>`.

---

## Don't Hand-Roll

- **Tab accessibility**: use `role="tablist"` / `role="tab"` / `aria-selected` — don't skip this  
- **Focus trap in modal**: `Modal.tsx` already handles this; don't re-implement  
- **Optimistic UI on save**: skip it — just show a saving spinner and re-fetch on success  
- **Debounced price input**: not needed; save is explicit (user clicks "Save")

---

## Key Design Decisions

### 1. Tab Icons for Metal Categories

Use simple colored circle indicators instead of images (keeps it fast and theme-consistent):

```tsx
const TAB_COLORS = {
  'gold-bars':    'bg-yellow-400/80',   // gold
  'gold-coins':   'bg-yellow-300/80',   // lighter gold
  'silver-bars':  'bg-slate-400/80',    // silver
  'silver-coins': 'bg-slate-300/80',    // lighter silver
  'pt-pd':        'bg-purple-300/60',   // platinum/palladium
};
```

Tabs are horizontal pill tabs, with active state: `border-b-2 border-primary text-primary`.

### 2. Price Card Visual Treatment

Big price number, gold color, centered or right-aligned. Under it:
- Freshness: `Updated 2 days ago` in muted text  
- Hint: `€ per gram pure Au · ~1.5% below spot`

Cards use `glass-panel` pattern (`bg-surface-high/30 border border-outline-variant/20 rounded-xl`).

### 3. Dealer Sidebar Card State

```
Selected:   bg-primary/10 border-l-2 border-primary
Hover:      bg-surface-high/50
Default:    bg-transparent
```

### 4. Add New Dealer Flow

Clicking "+ New Dealer" replaces the catalog panel with a compact add form (name + contact notes visible immediately; metal prices via tabs below). On save, dealer is added to sidebar and auto-selected, showing its new catalog.

### 5. Delete Confirmation

Inline within the catalog panel header (not a separate modal). Show "Are you sure? [Delete] [Cancel]" in a `bg-error/10 border border-error/30` strip above the tabs.

---

## Visual Reference: Matching the Holland Gold Aesthetic

| Holland Gold                           | Our Dark Theme Version                              |
|----------------------------------------|-----------------------------------------------------|
| White background, blue accent          | `#0b1326` background, `#e9c349` gold accent         |
| Blue active tab border                 | `border-b-2 border-primary` (gold)                  |
| Green price text `€128,31`             | `text-primary text-2xl font-mono` (gold, not green) |
| Clean sans-serif product names         | Inter, `text-sm font-medium text-on-surface`        |
| Spread text "1,50% onder spot"         | `text-[11px] text-on-surface-variant/50`            |
| Bold category tab icons                | Color-coded circle indicators                       |

---

## Common Pitfalls

1. **Re-using expand-in-place**: The current expand-in-row edit pattern feels cramped. The split panel gives breathing room and matches the "catalog" metaphor.

2. **Trying to show all prices at once**: Don't show all 6 price fields simultaneously. Tabs hide complexity — user sees exactly one price at a time, which is the catalog mental model.

3. **Mobile responsiveness**: `max-w-2xl` modal on small screens will clip the sidebar. Add `flex-col` fallback below `sm:` breakpoint — sidebar becomes a `<select>` or compact chip row.

4. **`tier = 0` falsy check**: Not directly related to dealer modal, but remember for Phase 14 ledger work: `tier != null` not `!tier`.

5. **`updated_at` staleness**: Don't show "0 days ago" as "Updated 0 days ago" — use "Updated today" for < 1 day. Already implemented in `daysAgo()` helper — keep it.

6. **Width of modal**: Current `max-w-xl` is too narrow for split-panel. Upgrade to `max-w-2xl` (672px).

---

## Implementation Task Breakdown (for planner)

### Plan 14-01: Redesign DealerManagementModal

**Scope:** Visual + structural refactor of `DealerManagementModal.tsx` only. No DB changes, no API changes.

Tasks:
1. Extract `DealerSidebar` component (dealer list + search)
2. Extract `DealerCatalogPanel` component (tabs + price cards)
3. Extract `MetalPriceCard` component (view + edit modes)
4. Assemble new split-panel layout in `DealerManagementModal`
5. Update modal width from `max-w-xl` → `max-w-2xl`
6. Keep all existing save/delete/add logic — only restructure presentation layer

### Plan 14-02: Weight Field + Ledger Liquidation Value

**Scope:** `AssetModal.tsx` weight field (shown for `precious_metals` only) + `LedgerPage.tsx` liquidation column.

Tasks:  
1. Add `weight_per_unit_grams` input to `AssetModal` (conditional on asset class)
2. Add dealer selector dropdown to Ledger filter bar
3. Add "Liquidation Value" column to Ledger table
4. Compute client-side: `qty × weight × dealer.we_buy_gold_per_gram`

---

## Confidence Assessment

| Claim                               | Confidence | Basis                                  |
|-------------------------------------|------------|----------------------------------------|
| Split-panel is the right pattern    | HIGH       | Matches catalog mental model + HG ref  |
| No new libraries needed             | HIGH       | All primitives exist                   |
| `max-w-2xl` fits split-panel        | HIGH       | 672px at 16px base = plenty            |
| Tab icons via CSS dots              | MEDIUM     | Could use Lucide icons — both work     |
| Mobile fallback is needed           | MEDIUM     | App is single-user desktop-first       |
