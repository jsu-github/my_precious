---
phase: 6
slug: concentration-warnings
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-02
---

# Phase 6 — UI Design Contract: Concentration Warnings

> Visual and interaction contract for the concentration warning system. All values derived from the existing codebase — no deviation from established design language.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (custom CSS inline styles) |
| Preset | not applicable |
| Component library | none |
| Icon library | none (Unicode/text symbols: ⚠, ✕) |
| Font | `system-ui, -apple-system, sans-serif` (inherited from `body`) |

---

## Spacing Scale

Matches existing usage across `DashboardPage.tsx` and `AssetsPage.tsx`:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inner badge spacing |
| sm | 8px / 0.5rem | Compact element gaps |
| md | 16px / 1rem | Default element spacing |
| lg | 20px / 1.25rem | Card internal padding |
| xl | 24px / 1.5rem | Section gaps |
| 2xl | 32px / 2rem | Page-level padding |
| 3xl | 48px / 3rem | Empty state top padding |

Exceptions: none

---

## Typography

Derived from existing concrete usage in `DashboardPage.tsx`:

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px / 0.875rem | 400 | 1.5 |
| Label (uppercase) | 12px / 0.75rem | 600 | 1 |
| Heading | 22px / 1.375rem | 600 | 1.3 |
| Metric display | 28–32px / 1.75rem | 700 | 1 |

Label uppercase uses `textTransform: uppercase`, `letterSpacing: 0.05em` — required for section headings (matches existing "Risk Heatmap", "Gross vs Net" pattern).

---

## Color

Derived from existing palette — no new colors introduced:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#0f172a` | Page background |
| Secondary (30%) | `#1e293b` | Cards, panels |
| Border | `#334155` | Card borders, buttons |
| Text primary | `#f1f5f9` | Headings, values |
| Text muted | `#94a3b8` | Labels, secondary text |
| Text dim | `#64748b` | Empty states, disabled |
| Warning amber | `#f59e0b` | Concentration 70–89% — text, borders, icons |
| Warning amber bg | `#451a03` | Amber warning card background |
| Critical red | `#ef4444` | Concentration 90%+ — text, borders |
| Critical red bg | `#450a0a` | Red warning card background |
| Success green | `#22c55e` | Low-risk indicators (unchanged) |

**Accent reserved for:** warning severity indicators, the percentage badge, and the left border accent on warning cards. Never on neutral interactive elements.

---

## Warning Card Anatomy

A concentration warning card is a **left-accent card** — the existing card pattern (`#1e293b`, `1px solid #334155`, `border-radius: 10px`) modified with a 4px left border override and matching background tint.

```
┌─────────────────────────────────────────────────────────────────┐
│ 4px left │  ⚠  EU Jurisdiction                   [62% of portfolio] │
│ accent   │  3 assets · €218,000                                    │
│ (amber/  ├─────────────────────────────────────────────────────────│
│  red)    │  Physical Gold  ·  €120,000  (55%)                       │
│          │  PAXG           ·  €68,000   (31%)                       │
│          │  Real Estate FR ·  €30,000   (14%)                       │
└─────────────────────────────────────────────────────────────────┘
```

**Severity tiers:**
- **Amber** (70–89%): `borderLeft: '4px solid #f59e0b'`, `background: '#451a03'`, `border: '1px solid #78350f'`
- **Red** (90%+): `borderLeft: '4px solid #ef4444'`, `background: '#450a0a'`, `border: '1px solid #7f1d1d'`

**Percentage badge** (top-right of card header):
- Amber tier: `background: '#78350f'`, `color: '#fcd34d'`, rounded pill `4px`, `fontSize: 0.75rem`, `fontWeight: 700`
- Red tier: `background: '#7f1d1d'`, `color: '#fca5a5'`, same shape

**Asset rows** (collapsed by default, always visible — no expand needed; max 5 rows before truncation):
- `fontSize: 0.8125rem`, `color: '#94a3b8'`
- Name left-aligned, value + pct right-aligned
- Subtle separator: `borderTop: '1px solid rgba(255,255,255,0.05)'`

---

## Layout: Warning Section on Dashboard

**Placement:** Immediately below the dashboard header (back button + title row), ABOVE the 4-column metrics strip. Cannot be missed.

**When no warnings exist:** Section is hidden entirely — no "all clear" empty state. Zero visual noise when healthy.

**When warnings exist:**
```
┌─────────────────────────────────────────────────────────────────┐
│  CONCENTRATION WARNINGS                    [Threshold: 70%  ▲▼] │
├─────────────────────────────────────────────────────────────────┤
│  [Warning Card 1 — Red]                                         │
│  [Warning Card 2 — Amber]                                       │
└─────────────────────────────────────────────────────────────────┘
```

Section heading: uppercase label style (`0.75rem`, `600`, `#64748b`, uppercase, `letterSpacing: 0.05em`), same as "Risk Heatmap" heading inside cards.

Cards stack vertically with `gap: 12px` (0.75rem). Red severity always rendered before amber.

---

## Threshold Configuration

**No separate settings page.** The threshold control is inline in the warning section header row, right-aligned.

```
CONCENTRATION WARNINGS                    Threshold: [70]%
```

Control: small number `<input>` (`type="number"`, `min=1`, `max=99`, `step=1`) styled to match the existing button aesthetic:
- `background: #1e293b`, `border: 1px solid #334155`, `color: #f1f5f9`
- `borderRadius: 6px`, `padding: 0.25rem 0.5rem`, `fontSize: 0.875rem`
- `width: 52px`, `textAlign: right`, `fontFamily: inherit`
- Label `%` appended as plain text in muted color `#64748b`
- Changes re-evaluate warnings immediately on `onChange` (debounced 300ms)
- Threshold persists to backend (`PUT /api/portfolio/threshold` or similar) on blur

When no warnings are active, the threshold control still renders if needed (as a standalone settings row)— but phase scope does NOT require a dedicated configuration page. The inline control satisfies WARN-01 ("threshold configurable").

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Section heading | `CONCENTRATION WARNINGS` |
| Threshold label | `Threshold:` (followed by input + `%`) |
| Warning header — tag name | Exact tag name as entered by user (no prefix) |
| Warning header — asset count | `{N} asset{s} · {formatted value}` |
| Percentage badge | `{N}% of portfolio` |
| Asset row | `{asset name}  ·  {value}  ({pct}%)` |
| No warnings (hidden) | *(no copy — section is not rendered)* |
| Error fetching warnings | `Could not compute concentration warnings.` |

No exclamation marks. No "Alert:" prefix. The severity is communicated through color and placement — not through alarming copy.

---

## Interaction Contract

| Interaction | Behavior |
|-------------|----------|
| Threshold input changed | Debounced 300ms → re-fetch/recompute warnings → DOM updates in place |
| Threshold input blur | Persist to backend |
| Threshold out of range (< 1 or > 99) | Clamp silently to [1, 99]; do not show validation error |
| Warning cards order | Red (90%+) before amber (70–89%), then by descending portfolio_pct |
| Asset row truncation | Show top 5 assets by value; append `+ {N} more assets` in muted text if truncated |

---

## Animation & Motion

None. Consistent with existing dashboard — no transitions, no fade-ins.

---

## Responsive Behavior

Warning cards are full-width within the `maxWidth: 1100` container. No special breakpoint handling needed for v1 (desktop-first PWA).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| None — custom CSS only | — | not required |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — all copy specified, no alarming prefixes, no placeholders
- [x] Dimension 2 Visuals: PASS — left-accent card pattern documented with exact pixel values
- [x] Dimension 3 Color: PASS — amber and red tiers defined, no new colors introduced
- [x] Dimension 4 Typography: PASS — all roles derived from existing `DashboardPage.tsx` usage
- [x] Dimension 5 Spacing: PASS — all tokens multiples of 4, derived from existing patterns
- [x] Dimension 6 Registry Safety: PASS — no external registry, custom CSS only

**Approval:** approved 2026-04-02
