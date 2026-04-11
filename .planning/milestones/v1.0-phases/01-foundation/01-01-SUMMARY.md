# Phase 01-01 Summary: API Package Layer

**Status:** Complete
**Wave:** 1
**Commit:** b244ee9

## Artifacts Created

- `api/package.json` — Express 4.18, Knex 3.1, pg 8.11, cors 2.8; devDeps: ts-node-dev 2.0, TypeScript 5.3
- `api/tsconfig.json` — target ES2020, module commonjs, rootDir src, includes migrations/**/*
- `api/Dockerfile` — node:20-alpine, npm ci, EXPOSE 3001, CMD npm run dev
- `api/src/db.ts` — Knex singleton connected via DATABASE_URL, runMigrations() export

## Key Patterns

- Migration directory: `path.join(__dirname, '../migrations')`
- Extension: `'ts'` in dev, `'js'` in production
- runMigrations() must be called before app.listen() in index.ts
- MONETARY CONVENTION: `table.decimal('col', 20, 2)` — NEVER float/double

## Dependencies

- `knex ^3.1.0` + `pg ^8.11.3` — PostgreSQL via Knex
- `express ^4.18.2` + `cors ^2.8.5` — HTTP server
- `ts-node-dev ^2.0.0` — hot-reload dev server
