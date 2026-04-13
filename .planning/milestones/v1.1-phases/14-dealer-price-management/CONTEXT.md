# Phase 14 Context — Dealer Price Management

## Decisions

| # | Grey Area | Decision |
|---|-----------|----------|
| A | Dealer management UI location | Side panel/modal opened from "Manage Dealers" button in Ledger filter bar |
| B | Liquidation Value column visibility | Always visible; shows '—' when no dealer selected, no dealer price, or no weight on asset |
| C | Weight field in AssetModal | Only shown when asset_class === 'precious_metals' |

## Key Notes

- Dealers API (GET/POST/PUT/DELETE /api/dealers) is fully implemented (Phase 13)
- `weight_per_unit_grams` column exists on assets table (Phase 13)
- `LedgerRow.weight_per_unit_grams` is returned from the API (Phase 13 ledger.ts change)
- `Dealer` and `TierConfig` types exist in types.ts (Phase 13)
- `api.dealers.*` and `api.tierConfig.*` methods exist in api.ts (Phase 13)
- Selected dealer = client state only (no DB persistence required)
- Liquidation formula: `quantity × weight_per_unit_grams × dealer.we_buy_gold_per_gram`
- "Updated X days ago" computed from dealer.updated_at

## Codebase Patterns

- CSS tokens: `glass-panel`, `text-primary` (#e9c349), `text-secondary` (#4edea3), `text-error` (#ffb4ab)
- Font: `font-headline italic` for headings (Newsreader), Inter for body
- Modal pattern: use `<Modal>` from `components/modals/Modal.tsx`
- Form fields: `<Field>`, `<Input>`, `<Select>`, `<Textarea>`, `<FormActions>`, `<ErrorMessage>` from FormFields.tsx
- Filter bar select style: `bg-surface-high/60 border border-outline-variant/30 rounded text-sm ...`
- No React Router — navigation via `onNavigate` prop callback
