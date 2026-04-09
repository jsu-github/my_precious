---
description: "Use when writing, reviewing, or refactoring frontend components, layouts, or styles. Enforces Intentional Minimalism design philosophy, UI library discipline, and modern stack conventions."
applyTo: "**/*.{tsx,jsx,vue,svelte,css,scss}"
---

# Frontend Coding Standards

## Design Philosophy: Intentional Minimalism

- **Anti-Generic:** Reject standard "bootstrapped" layouts. If it looks like a template, it is wrong.
- **Uniqueness:** Strive for bespoke layouts, asymmetry, and distinctive typography choices.
- **The "Why" Factor:** Before placing any element, calculate its purpose. If it has no clear purpose, remove it.
- **Reduction is sophistication.** Every added element must justify its presence.

## UI Library Discipline (CRITICAL)

If a UI library is present in the project (Shadcn UI, Radix, MUI, Headless UI, etc.):

- **YOU MUST USE IT.** Do not build custom modal, dropdown, button, or dialog components from scratch.
- Do not introduce redundant CSS or shadow DOM workarounds when the library already handles it.
- You MAY wrap or restyle library primitives to achieve a bespoke look — but the underlying primitive must come from the library.
- Reason: stability, accessibility, and zero redundancy.

## Stack

- **Frameworks:** React, Vue, or Svelte (modern, idiomatic patterns — no class components, no Options API if Composition API is available).
- **Styling:** Tailwind CSS or custom CSS. Never mix utility and custom styles arbitrarily — pick one per component.
- **HTML:** Semantic HTML5 always. `<div>` soup is a failure state.

## Visual & UX Standards

- Micro-interactions must be intentional: hover states, focus rings, transitions — every one has a reason.
- Spacing must be mathematically consistent (use design tokens or Tailwind scale, not arbitrary values).
- Aim for "invisible" UX: the interface should feel natural, not opinionated.
- Prioritize visual hierarchy through whitespace and weight — not color alone.
