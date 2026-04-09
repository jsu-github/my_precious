---
name: dashboard-design-principles
description: >
  Dashboard design and UX best practices for data products. Apply when designing,
  writing, or reviewing any dashboard layout, KPI card, chart, filter, or
  data-display component in the frontend.
applyTo: "frontend/**"
license: MIT
metadata:
  author: Akkuro Savings & Investments
  version: "1.1.0"
---

# Dashboard Design Principles

Comprehensive UX and design guidance for building trustworthy, actionable dashboards, applied to the Akkuro design system. Contains 30 rules across 7 categories, prioritized by impact.

## When to Apply

Reference these guidelines when:
- Designing or reviewing dashboard layouts and information hierarchy
- Writing or refactoring KPI cards, trend charts, or data tables
- Implementing filter controls, drill-downs, or navigation patterns
- Choosing colors, labels, or scales for any data visualization
- Auditing a dashboard for trust, accessibility, or data quality

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Foundational Design | CRITICAL | `design-` |
| 2 | Data Quality & Trust | CRITICAL | `trust-` |
| 3 | KPI Components | HIGH | `kpi-` |
| 4 | Trends & Charts | HIGH | `trend-` |
| 5 | Filters & Interactivity | MEDIUM | `filter-` |
| 6 | Dashboard Archetypes | MEDIUM | `arch-` |
| 7 | Accessibility & Lifecycle | MEDIUM | `a11y-` |

## Quick Reference

### 1. Foundational Design (CRITICAL)

- `design-question-driven` — Define 1–5 explicit questions the dashboard must answer (e.g., "Are we on track this month?"). Cut every chart that does not help answer one of those questions.
- `design-5sec-rule` — The core message and health of all key metrics must be graspable within five seconds of opening the dashboard.
- `design-hierarchy` — Follow the progressive visual hierarchy: **Top-left** = KPIs (The "What") · **Top-right** = Primary trends (The "Where are we going") · **Middle** = Drivers and contributors (The "Why") · **Bottom** = Diagnostics and granular breakdowns (The "Details").
- `design-consistency` — Use the same color for the same metric everywhere. Keep consistent axis scales across comparable charts. Unify terminology — never mix "Revenue", "Sales", and "Turnover" for the same concept across a dashboard.
- `design-process-order` — Sort categorical dimensions (statuses, stages, phases) by their business-process order, not alphabetically. Alphabetical order is meaningless to users who reason in workflow sequence (e.g., `To Do → In Progress → Review → Done`, not `Done → In Progress → Review → To Do`). Encode this order in the data layer (e.g., a SQL `CASE` expression) so the frontend never has to re-sort.

### 2. Data Quality & Trust (CRITICAL)

- `trust-timestamp` — Every dashboard must display a "Last Refreshed" timestamp. Without it, users cannot assess staleness.
- `trust-definitions` — Expose metric definitions via a tooltip or info icon on every KPI. Users should never have to guess what a number represents.
- `trust-ownership` — State the data source and the team or person responsible for maintaining the dashboard (e.g., "Maintained by the RevOps team").
- `trust-annotations` — Add contextual annotations to explain anomalies, spikes, or dips (e.g., "Spike due to AWS outage on Oct 12"). Unexplained outliers destroy trust.
- `trust-sla-denominator` — When computing a compliance or SLA percentage, only include items that are actually subject to that SLA (i.e., items with a defined deadline or target). Including items without a deadline inflates the compliant count and produces a misleadingly positive rate. Document the denominator rule in the metric definition tooltip.

### 3. KPI Components (HIGH)

- `kpi-target-context` — A number without context cannot drive action. Always show target, SLA, or budget alongside the value, plus a direction indicator (e.g., "€50,000 Revenue — 95% of target, ↓5% MoM").
- `kpi-color-semantic` — Color must signal action, not decoration. Neutral metrics use `--color-info` or `--color-text-muted`. Reserve `--color-success` and `--color-danger` strictly for performance against thresholds. Never use generic green/red for decoration.
- `kpi-worst-first` — In any ranked list or table adjacent to KPIs, default the sort order to most-critical first (e.g., highest overdue days, largest budget variance). Users opening an operational dashboard need to act on the worst item immediately — never make them sort manually.
- `kpi-breakdown-alongside-total` — For every top-level aggregate KPI, provide a per-category breakdown (e.g., per priority, per team, per region) so users can identify which segment is driving the total. A single aggregate number masks root causes.

### 4. Trends & Charts (HIGH)

- `trend-y-axis` — Default to zero-based Y-axes for executive or summary views to prevent exaggerating minor fluctuations. Non-zero axes are acceptable for analytical audiences to reveal meaningful micro-variations, but must be clearly labeled.
- `trend-time-context` — Always label time granularity (daily / weekly / monthly). Mark partial periods explicitly (e.g., "Month-to-Date"). Add Year-over-Year overlays when seasonality is relevant to prevent misinterpretation.
- `trend-fixed-window` — Use a fixed, named lookback window for all trend charts (e.g., "Last 30 days", "Last 12 weeks"). An unbounded or variable window makes it impossible to compare charts across sessions or share screenshots with colleagues. Make the window configurable only when the analytical archetype (`arch-analytical`) explicitly requires it.

### 5. Filters & Interactivity (MEDIUM)

- `filter-limit` — Limit global filters to approximately five. More filters overwhelm casual users. Always include a visible "Reset to Default" button. The default state must represent the most common, useful business view — not raw unfiltered data.
- `filter-drill-mode` — Be intentional with navigation depth. **Drill-down**: expand detail on the same page (e.g., a "Q1" bar expanding to show months). **Drill-through**: navigate the user to a completely separate, highly detailed dashboard or tabular view.
- `filter-contextual-kpis` — When any filter is active, recompute all KPI values over the filtered subset — never show the unfiltered totals alongside a filtered breakdown. A KPI that contradicts the visible table destroys trust and causes interpretation errors.
- `filter-composed` — When multiple filter dimensions are available (e.g., priority + status), apply them in sequence: the first filter narrows the dataset, the second operates on that narrowed result. All charts, panels, and breakdowns on the page must reflect the composed filter state simultaneously.
- `filter-active-pills` — Render each active filter as a dismissible pill badge (label + × button) in a persistent location (e.g., the page header or filter bar). Users must always be able to see what is filtered and remove individual filters with one click.

### 6. Dashboard Archetypes (MEDIUM)

Align the design with the user's operating cadence — mismatched depth and interactivity is the most common cause of dashboard abandonment.

- `arch-strategic` — **Executives / Leadership.** Long-term goals. Heavy on KPIs, lagging indicators, and targets against budget. Minimal interactivity. Load must be near-instant.
- `arch-tactical` — **Team Leads / Product Owners.** Short-term (days/weeks). Mix of KPIs and drivers used to guide weekly rituals like standups or sprint reviews. Moderate interactivity.
- `arch-operational` — **Frontline / Managers.** Real-time or near-real-time monitoring. Heavy on leading indicators, thresholds, and alerts. Prioritizes immediate clarity over deep analysis.
- `arch-analytical` — **Data Analysts / Strategists.** Deep exploration and root-cause analysis. High interactivity, extensive filtering, complex visualizations, and full drill-through capabilities.

### 7. Accessibility & Lifecycle (MEDIUM)

- `a11y-colorblind` — Use color-blind safe palettes. Color must never be the sole encoding for meaning — always pair with a label, icon, or pattern.
- `a11y-no-hover-only` — Critical status information must never depend solely on hover or tooltip states. Hover is enhancement, not the primary communication channel.
- `a11y-font-size` — Ensure font sizes are legible on all intended devices. A dashboard designed for a laptop `text-sm` may be unreadable on an office TV. Test on target hardware.
- `a11y-performance` — Dashboards are products; they must load quickly. Lazy-load heavy chart components. Avoid blocking server-side data fetches that are not needed above the fold.
- `a11y-retirement` — Establish a clear retirement and review policy. Delete or archive unused or outdated dashboards to prevent workspace clutter and confusion about which version is authoritative.

---

## Akkuro Token Mapping for Dashboard Semantics

When applying the rules above in this repository, bind semantic dashboard colors to Akkuro design tokens — never use generic Tailwind color names like `green-700` or `red-500`.

| Semantic Role | CSS Variable | Hex | Tailwind Class | Rule Reference | Use |
|---|---|---|---|---|---|
| Positive / success | `--color-success` | `#229554` | `text-[#229554]` / `bg-[#D3EADD]` | `kpi-color-semantic` | KPI above target, SLA met, count decreasing (good trend) |
| Success dark (text on light bg) | `--color-success-dark` | `#176338` | `text-[#176338]` | `kpi-color-semantic` | Value text on `bg-[#D3EADD]` KPI card |
| Warning / approaching limit | `--color-warning` | `#FFAF38` | `text-[#FFAF38]` / `bg-[#FFEFD7]` | `kpi-color-semantic` | KPI within 10–20% of threshold breach |
| Warning dark (text on light bg) | `--color-warning-dark` | `#AA7525` | `text-[#AA7525]` | `kpi-color-semantic` | Value text on `bg-[#FFEFD7]` badge |
| Negative / danger | `--color-error` | `#EB5757` | `text-[#EB5757]` / `bg-[#FBDDDD]` | `kpi-color-semantic` | KPI below target, SLA breached, error count rising |
| Danger dark (Blocker priority) | `--color-error-dark` | `#9D3A3A` | `text-[#9D3A3A]` | `kpi-color-semantic` | Blocker priority — darkest tier of error palette |
| Neutral / informational | `--color-info` | `#2B7FFF` | `text-[#2B7FFF]` / `bg-[#D5E5FF]` | `kpi-color-semantic` | Metrics without a threshold; In Progress / Review statuses |
| Info dark (text on light bg) | `--color-info-dark` | `#1D55AA` | `text-[#1D55AA]` | `kpi-color-semantic` | Value text on `bg-[#D5E5FF]` badge |
| Muted / secondary | `--color-text-muted` | `#777777` | `text-[#777777]` | `design-consistency` | Labels, subtitles, secondary values, time granularity markers |
| Faded / dimmed | `--color-grey-03` | `#CCCCCC` | `text-[#CCCCCC]` | `design-consistency` | Empty / null values, dimmed decorative text |
| Primary accent (Marine) | `--color-marine` | `#008071` | `text-[#008071]` / `bg-[#008071]` | `design-consistency` | Primary trend line, active filter indicator, key highlights |
| Border / divider | `--color-border` | `#DDDDDD` | `border-[#DDDDDD]` / `stroke="#DDDDDD"` | `design-consistency` | Card borders, chart grid lines, section separators |
| Primary text | `--color-text-primary` | `#1A2419` | `text-[#1A2419]` | `design-consistency` | Body copy, table cell values, chart tooltips |

### Color Application Rules

1. **Never** use `text-green-*`, `text-red-*`, or `text-yellow-*` — always use the Akkuro tokens above.
2. A KPI card's indicator dot or delta value uses success/warning/danger tokens based on position relative to the threshold, not based on whether the number went up or down (a rising error count is still `--color-error`).
3. Charts that display multiple series use semantic tokens (Blocker `#9D3A3A` → Critical `#EB5757` → Major `#FFAF38` → Minor `#2B7FFF`). Never use the Okabe–Ito palette (`#CC79A7`, `#D55E00`, `#E69F00`, `#0072B2`).
4. The page background is `bg-white` (`--color-bg`). Cards on the page also use `bg-white` with a `border-[#DDDDDD]` border — the distinction is the card border, not a tinted page background.
5. Old retired tokens (`#73C088`, `#F3C74D`, `#E86B6B`, `#5FAEE3`, `#dae7e5`, `#5e8d87`, `#101818`, `#004D44`, `#f5f8f8`) must **never** be reintroduced.
