# Design System Document: Modern Dark Excellence

## 1. Overview & Creative North Star
**Creative North Star: "The Sovereign Vault"**

This design system is engineered to move beyond the "SaaS dashboard" aesthetic and into the realm of high-end editorial finance. It treats data not as a commodity, but as a private collection of assets. By rejecting the rigid, "boxed-in" layout of traditional fintech, we embrace **The Sovereign Vault**—a philosophy of depth, quiet confidence, and atmospheric sophistication.

The interface breaks the "template" look through:
*   **Intentional Asymmetry:** Utilizing wide gutters and varying card widths to create a bespoke, non-linear reading flow.
*   **Tonal Depth:** Moving away from flat hex codes in favor of layered, translucent surfaces.
*   **Editorial Authority:** High-contrast pairings between a sharp, functional sans-serif and a prestigious, high-contrast serif.

---

## 2. Colors: The Midnight Palette
The color strategy relies on a "Low-Light" philosophy. By keeping the base extremely dark, we allow the gold and emerald accents to "glow" with perceived value.

### Core Tones
*   **Base (Background):** `#0b1326` (Midnight Blue-Black). This is the canvas of the vault.
*   **Primary (The Gold Standard):** `#e9c349`. Used sparingly for primary actions and "wealth" indicators.
*   **Secondary (The Growth Emerald):** `#4edea3`. Reserved strictly for positive performance and upward trends.
*   **Tertiary (The Slate Overlay):** `#b9c7e0`. A muted, cooling tone for secondary data and meta-information.

### Surface Hierarchy & The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Structural definition must be achieved through **Surface Nesting**:
*   **The Foundation:** Use `surface` (`#0b1326`) for the main application background.
*   **The Content Blocks:** Use `surface-container-low` (`#131b2e`) for the primary workspace.
*   **The Priority Nodes:** Use `surface-container-high` (`#222a3d`) for interactive cards or highlighted widgets.
*   **The Nested Detail:** Use `surface-container-highest` (`#2d3449`) for inner-card elements like search bars or dropdown triggers.

### The "Glass & Gradient" Rule
To evoke a sense of high-precision security, floating elements (modals, popovers) must use **Glassmorphism**:
*   **Surface:** `surface-container-highest` at 70% opacity.
*   **Effect:** `backdrop-blur: 24px`.
*   **Signature Texture:** Main CTAs should utilize a subtle linear gradient from `primary` to `on_primary_container` at a 135-degree angle to provide a metallic, tactile quality.

---

## 3. Typography: The Authoritative Voice
The system utilizes a dual-typeface approach to balance tradition with modernity.

### Typography Scale
*   **Display & Headlines (Newsreader):** Use `display-lg` through `headline-sm` for portfolio totals, section titles, and high-level summaries. The serif conveys heritage and exclusivity.
    *   *Styling Note:* Use "optical sizing" and tight letter-spacing for headlines to maintain a "sharp" edge.
*   **Interface & Data (Inter):** Use `title-lg` through `label-sm` for all functional elements, numbers, and body text.
    *   *Styling Note:* Tabular numbers (tnum) must be enabled for all financial figures to ensure alignment in columns.

---

## 4. Elevation & Depth
In this system, elevation is a physical property of light and transparency, not just a drop shadow.

*   **The Layering Principle:** Depth is created by stacking lighter surfaces on darker ones. An active state is never a border; it is a shift from `surface-container-low` to `surface-container-high`.
*   **Ambient Shadows:** For elements that must float (e.g., a "Transfer Funds" modal), use a shadow color derived from `surface_container_lowest` at 40% opacity with a blur of `48px`. This mimics an ambient glow rather than a harsh shadow.
*   **The Ghost Border:** For accessibility in input fields or card boundaries, use a `0.5px` border with `outline_variant` (`#45464d`) at 20% opacity. It should be felt, not seen.
*   **Atmospheric Gradients:** Apply a subtle radial gradient of `surface_bright` in the top-left corner of the viewport to simulate a soft spotlight on the user's data.

---

## 5. Components

### Buttons
*   **Primary:** A gold gradient (`primary` to `on_primary_container`) with `on_primary` text. Border radius set to `md` (0.375rem) for a precise, architectural feel.
*   **Secondary:** A "Ghost Border" frame with `primary` text. No background fill.
*   **Tertiary:** Purely text-based using `label-md` in `tertiary` color, shifting to `surface_bright` on hover.

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines to separate list items. Use 16px or 24px of vertical white space or a subtle background shift to `surface-container-lowest`.
*   **Glass Cards:** For high-level metrics (e.g., Total Net Worth), use a backdrop-blur of 20px on a `surface-container-low` base to make the data feel "suspended" in the vault.

### Input Fields
*   **Default State:** Background `surface_container_highest` with a 10% opacity `outline_variant`.
*   **Active State:** Background `surface_container_highest` with a `1px` bottom-border of `primary`.
*   **Error State:** Text and bottom-border in `error` (`#ffb4ab`).

### Signature Component: The "Growth Sparkline"
*   A custom component for financial trends. Use a 2px stroke width. If the trend is positive, use `secondary` (`#4edea3`) with a soft glow effect (`drop-shadow`). If negative, use `error` with no glow.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme white space. High-net-worth interfaces should feel "expensive" through room to breathe.
*   **Do** use `on_surface_variant` for labels to keep the visual hierarchy focused on the data values (`on_surface`).
*   **Do** use `secondary_fixed` for success indicators to ensure they pop against the dark background.

### Don't
*   **Don't** use pure black (`#000000`). It kills the "midnight" atmospheric depth.
*   **Don't** use standard 1px solid borders. They make the UI look like a generic spreadsheet.
*   **Don't** use bright "safety" greens. Only use the refined Emerald (`secondary`) provided in the palette.
*   **Don't** use large corner radii. Stick to `sm` and `md` to keep the aesthetic "sharp" and professional. Avoid `full` (pill shapes) except for status chips.
