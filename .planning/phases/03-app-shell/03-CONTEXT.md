---
phase: 03-app-shell
generated: auto (yolo mode)
date: 2026-04-10
---

# Phase 3 Context: App Shell

## Phase Goal
The React app renders the complete Midnight Sovereign visual chrome — Sidebar, TopHeader, and discriminated-union navigation work across all 6 named routes (pages show placeholder content).

## Design System Reference
Source: `.stitch/design-system/midnight-sovereign.json`

### Palette
| Token | Value | Use |
|-------|-------|-----|
| background | `#0b1326` | Root background |
| primary | `#e9c349` | Gold — brand accent, active states |
| secondary | `#4edea3` | Emerald — success, connected status |
| on-surface | `#dae2fd` | Primary text (light blue-white) |
| on-surface-variant | `#c6c6cd` | Secondary text |
| surface-high | `#222a3d` | Card/panel backgrounds |
| surface-highest | `#2d3449` | Hover backgrounds |
| surface-low | `#131b2e` | Sidebar background |
| surface-base | `#171f33` | Slightly elevated surface |
| outline-variant | `#45464d` | Subtle borders |
| error | `#ffb4ab` | Error/warning |

### Typography
- Headline: Newsreader (italic for wordmark, upright for display text)
- Body/Label: Inter
- Numeric values: tabular-nums font feature

### Other Tokens
- roundness: `4px` (border-radius-sm)
- spacingScale: 3 (standard Tailwind)

## Decisions (Locked)

### D-01: Package installs
- tailwindcss + postcss + autoprefixer (via inline Vite PostCSS config in vite.config.ts — avoids extra COPY in Dockerfile)
- @fontsource/newsreader (400, 400-italic) + @fontsource/inter (400, 500, 600, 700) — avoids CDN dependency
- lucide-react for SVG icons (not a UI component library — tree-shakeable SVG set)

### D-02: Tailwind config location  
- `frontend/tailwind.config.ts` — COPY'd in Dockerfile, mounted in docker-compose for hot-reload

### D-03: PostCSS config approach
- Inline in `vite.config.ts` via `css.postcss` key — avoids extra file to mount

### D-04: Navigation View type
```typescript
type View = 'dashboard' | 'ledger' | 'analytics' | 'locations' | 'tax' | 'entity';
type EntityFilter = 'personal' | 'business' | 'global';
```

### D-05: Nav items
1. Dashboard → LayoutDashboard icon
2. Ledger → BookOpen icon  
3. Analytics → TrendingUp icon
4. Locations → MapPin icon
5. Tax & Compliance → Shield icon
6. Business vs Personal → Building2 icon

### D-06: Active nav styling
```
border-l-2 border-primary text-primary bg-surface-high/50
```

### D-07: TopHeader entity toggle
Three tabs: Personal | Business | Global (all combined)
Tabs rendered as pill buttons, active tab has gold underline/fill style.

### D-08: "Transfer Funds" CTA
Rendered in Sidebar footer area as a styled button with ArrowLeftRight icon.
Non-functional in Phase 3 — Phase 10 adds the modal.

### D-09: Glassmorphism pattern
```css
.glass-panel {
  background: rgba(34, 42, 61, 0.7);  /* surface-high at 70% */
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

## Deferred
- Actual data in page stubs (Phases 4–9)
- Search functionality in TopHeader (Phase 4+)
- Transfer Funds modal (Phase 10)
- Self-hosted font files in public/fonts/ (Phase 12 — using @fontsource for now)
