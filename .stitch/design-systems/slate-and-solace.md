# Design System Document: High-End Portfolio Management

## 1. Overview & Creative North Star: "The Financial Atelier"

This design system is built upon the Creative North Star of **"The Financial Atelier."** In a sector often defined by cluttered dashboards and aggressive data density, this system treats portfolio management as a curated, editorial experience. It moves away from the "software template" look, opting instead for the poise of a high-end architectural journal.

We achieve this through **Intentional Asymmetry** and **Airy Composition**. By leveraging generous whitespace (macro-typography) and tonal layering, we guide the investor's eye toward what matters: growth and security. The interface does not shout; it breathes. 

---

## 2. Colors: Tonal Depth & The "No-Line" Rule

The palette is rooted in sophistication. We use deep slates and navies not as blocks, but as surgical accents that anchor the user's trust.

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. They create visual noise and "trap" data. Instead, boundaries must be defined solely through **background color shifts**. Use `surface-container-low` sections sitting on a `surface` background to define regions.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper.
- **Base Layer:** `surface` (#f7f9fb)
- **Secondary Sectioning:** `surface-container-low` (#f0f4f7)
- **Interactive/Floating Elements:** `surface-container-lowest` (#ffffff)
- **Deep Insets (Data Grids):** `surface-container-high` (#e1e9ee)

### Glass & Gradient Rules
To provide "soul" to the data:
- **Glassmorphism:** For floating navigation or modal overlays, use `surface` at 80% opacity with a `20px` backdrop-blur. This ensures the app feels like a single, cohesive environment.
- **Signature Gradients:** Main CTAs and high-level portfolio summaries should use a subtle linear gradient from `primary` (#545f73) to `primary-dim` (#485367) at a 135-degree angle.

---

## 3. Typography: The Editorial Scale

We pair **Manrope** (Display/Headline) for an authoritative, modern personality with **Inter** (Title/Body) for maximum legibility. **Note: Under no circumstances shall italics be used.**

- **Display (Manrope):** Use `display-lg` (3.5rem) for total portfolio value. The large scale conveys confidence.
- **Headlines (Manrope):** `headline-md` (1.75rem) serves as the primary anchor for section headers.
- **Body (Inter):** `body-lg` (1rem) for standard data; `body-sm` (0.75rem) for secondary metadata.
- **Hierarchy through Weight:** Use `Medium (500)` and `Semi-Bold (600)` weights to create hierarchy rather than color changes. This keeps the interface "light" while remaining functional.

---

## 4. Elevation & Depth: Tonal Layering

We reject traditional heavy shadows in favor of **Tonal Layering** and **Ambient Light**.

- **The Layering Principle:** To lift a card, do not reach for a shadow first. Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#f0f4f7) background. The 3% shift in lightness is enough for the human eye to perceive elevation.
- **Ambient Shadows:** If a "floating" state is required (e.g., a dropdown), use a shadow with a `32px` blur, `0px` spread, and `4%` opacity using the `on-surface` (#2a3439) color. It should look like a soft glow, not a dark stain.
- **The "Ghost Border" Fallback:** For accessibility in form fields, use a "Ghost Border": the `outline-variant` token at **15% opacity**. This provides a hint of structure without breaking the airy aesthetic.

---

## 5. Components: Refined Interaction

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-dim`), white text (`on-primary`), and `DEFAULT` (0.5rem) corner radius.
- **Secondary:** `surface-container-high` background with `on-surface` text. No border.
- **Tertiary:** Pure text with `on-primary-fixed` color, using 1.5x letter spacing for a premium feel.

### Cards & Lists
- **The Divider Ban:** Do not use line dividers between list items. Use **Vertical Whitespace** (minimum 16px) or alternating subtle backgrounds (`surface` to `surface-container-low`).
- **Data Visualization:** Charts should use `primary` for growth and `error` (#9f403d) for loss, but with the fills using a 10% opacity tint to maintain the light-themed "wash."

### Input Fields
- **State:** Instead of a thick border on focus, use a subtle background shift to `surface-container-lowest` and a soft `primary` glow (ambient shadow).
- **Labels:** Use `label-md` in `on-surface-variant` (#566166), always positioned above the field, never as a placeholder.

### Portfolio Specific Components
- **Trend Pills:** Use `tertiary-container` for neutral or "watching" assets to provide a sophisticated color departure from the standard red/green binary.
- **Metric Tiles:** Large `display-sm` numbers paired with `label-sm` descriptors to create an "Information Dashboard" look typical of high-end Bloomberg terminals but softened for the modern investor.

---

## 6. Do's and Don'ts

### Do
- **Do** use asymmetrical margins. If a left margin is 48px, try a right margin of 64px for a custom, editorial feel.
- **Do** maximize whitespace. If it feels "empty," it's likely working.
- **Do** use `ROUND_EIGHT` (0.5rem) consistently for all containers to maintain the "approachable professional" vibe.

### Don't
- **Don't** use pure black (#000000) for text. Use `on-surface` (#2a3439) to keep the contrast high but the feel "soft."
- **Don't** use italics. Ever. For any reason.
- **Don't** use standard "Material" shadows. If the shadow is visible at a glance, it is too heavy.
- **Don't** crowd the edges. Data should "float" in the center of its container with at least 24px of internal padding.
