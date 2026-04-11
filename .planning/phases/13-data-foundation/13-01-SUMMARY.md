---
phase: 13-data-foundation
plan: 01
subsystem: database, api
tags: [postgres, knex, migrations, express, dealers, tier-config]

requires: []
provides:
  - dealers table (id, name, contact_notes, we_buy_gold_per_gram NUMERIC(10,4), updated_at)
  - tier_config table with 4 seeded rows (Grid-Down Baseline, Digital Liquidity, The Vaults, Uncensorable Frontier)
  - weight_per_unit_grams + tier columns added to assets table
  - GET/POST/PUT/DELETE /api/dealers Express route
  - GET/PUT/:tierId /api/tier-config Express route
affects: [13-02, 14-dealer-management, 15-sovereign-tier, 16-dashboard-health]

tech-stack:
  added: []
  patterns: [named knex import as db, createTableIfNotExists + onConflict.ignore() for idempotent seed]

key-files:
  created:
    - api/migrations/010_dealers.ts
    - api/migrations/011_tier_system.ts
    - api/src/routes/dealers.ts
    - api/src/routes/tierConfig.ts
  modified:
    - api/src/routes/index.ts

key-decisions:
  - "dealers uses a single updated_at timestamp (no created_at) matching intended schema"
  - "tier_id 0 (Grid-Down Baseline) is a valid zero value — must never check if (tier), always tier != null"
  - "tier_config seeded with onConflict('tier_id').ignore() for migration idempotency"
  - "named export import { knex as db } from '../db' — db.ts has no default export"

patterns-established:
  - "Route files import { knex as db } from '../db' (named, not default)"
  - "404 shape: { error: { message: 'Not found', status: 404 } } matching project error contract"

requirements-completed: []

duration: 15min
completed: 2026-04-11
---

# Phase 13: Data Foundation — Plan 01 Summary

**Created dealers + tier_config tables, extended assets schema, and wired all 6 route handlers — all endpoints callable with migrations auto-applied on startup.**

## What Was Built

- `010_dealers.ts` — dealers table with NUMERIC(10,4) price field
- `011_tier_system.ts` — alterTable assets (weight_per_unit_grams, tier) + tier_config table seeded with 4 sovereign tiers
- `dealers.ts` — full CRUD router (GET list, POST create, PUT /:id, DELETE /:id)
- `tierConfig.ts` — GET list + PUT /:tierId pct-update router
- `routes/index.ts` — both routers mounted at /dealers and /tier-config

## Verification Passed

- `GET /api/dealers` → `[]` (200)
- `GET /api/tier-config` → 4 rows, tier_id 0–3, pct values correct
- `GET /api/assets` → all rows include `weight_per_unit_grams: null` and `tier: null`
- `POST /api/dealers {"name":"Test Dealer"}` → 201 with id
- `DELETE /api/dealers/1` → 204 (cleanup)
- No TypeScript errors in src/ route files (pre-existing rootDir config issue affects migrations only)

## Self-Check: PASSED
