# STACK
_Last updated: 2026-04-18_

## Overview

Precious Dashboard is a full-stack TypeScript monorepo with three services: a React 18 SPA frontend (Vite 5, installable PWA), an Express 4 REST API, and a PostgreSQL 16 database — all orchestrated by Docker Compose. A standalone Python 3 scraper runs outside Docker on a cron schedule to populate dealer buy-back prices. No auth layer; single-user personal tool.

---

## Languages

**Primary:**
- TypeScript 5.3 — `api/` and `frontend/` (`^5.3.3` in both `api/package.json` and `frontend/package.json`)
- Python 3.x — `scraper/` only (`scraper/main.py`, `scraper/scraper.py`)

**Secondary:**
- SQL — written via Knex.js DSL in `api/migrations/*.ts`

---

## Runtime

**Node.js:**
- API: runs inside `api/Dockerfile`; dev hot-reload via `ts-node-dev --respawn --transpile-only src/index.ts`
- Frontend: Vite dev server inside `frontend/Dockerfile`; container port 3000, exposed on host port 4000

**Python:**
- Scraper: standalone, not containerised
- Install: `pip install -r scraper/requirements.txt && playwright install chromium`

**Package Managers:**
- API + Frontend: npm — lockfiles at `api/package-lock.json`, `frontend/package-lock.json`
- Scraper: pip — `scraper/requirements.txt`

---

## Frameworks

**Backend:**
- Express 4.18.2 — REST API (`api/package.json`)
- Knex 3.1.0 — query builder + migration runner (`api/package.json`, `api/src/db.ts`)

**Frontend:**
- React 18.2.0 — UI framework (`frontend/package.json`)
- Vite 5.1.3 — dev server + bundler (`frontend/vite.config.ts`)
- Tailwind CSS 3.4.3 — utility-first CSS (`frontend/tailwind.config.ts`)

**Scraper:**
- Playwright ≥1.40.0 — headless Chromium browser (`scraper/requirements.txt`, `scraper/scraper.py`)
- requests ≥2.31.0 — HTTP client for posting prices back to the API (`scraper/main.py`)

---

## Key Libraries

**Frontend (`frontend/package.json`):**
| Package | Version | Purpose |
|---------|---------|---------|
| `lucide-react` | ^0.400.0 | Icon set |
| `react-simple-maps` | ^3.0.0 | SVG world map for asset location pins (`frontend/src/pages/LocationsPage.tsx`) |
| `xlsx` | ^0.18.5 | Parse `.csv`/`.xlsx` files in `frontend/src/components/ImportWizard.tsx` |
| `@fontsource/manrope` | ^5.0.0 | Primary display font (self-hosted) |
| `@fontsource/inter` | ^5.0.0 | Body/UI font (self-hosted) |
| `vite-plugin-pwa` | ^0.20.0 | Workbox service worker + PWA manifest |
| `autoprefixer` | ^10.4.19 | PostCSS vendor prefixing |

**Backend (`api/package.json`):**
| Package | Version | Purpose |
|---------|---------|---------|
| `pg` | ^8.11.3 | PostgreSQL driver for Knex |
| `cors` | ^2.8.5 | CORS middleware (permissive — no auth) |
| `ts-node-dev` | ^2.0.0 | Dev hot-reload runner |

**Root workspace (`package.json`):**
| Package | Version | Purpose |
|---------|---------|---------|
| `svgexport` | ^0.4.2 | SVG → PNG conversion for PWA icons |

---

## Build Toolchain

**Frontend:**
- Dev: `vite` dev server with HMR, container port 3000 (host port 4000)
- Build: `tsc && vite build` — TypeScript check then Vite bundle
- Config: `frontend/vite.config.ts`, `frontend/tsconfig.json`
- PostCSS: Tailwind CSS + Autoprefixer inline in `vite.config.ts`
- PWA: Workbox `NavigateFallback: '/'`; API routes cached `NetworkFirst`, 5s timeout, 5-min TTL, `api-cache` bucket; app name "The Vault — Precious Dashboard"

**Backend:**
- Dev: `ts-node-dev --respawn --transpile-only src/index.ts`
- Build: `tsc` → `dist/`; entry `dist/index.js`
- Config: `api/tsconfig.json` (CommonJS output, `rootDir: src`, `outDir: dist`)
- Migrations: `.ts` files in dev, `.js` in production (controlled by `NODE_ENV` in `api/src/db.ts`)
- Migrations auto-run at API startup via `runMigrations()` called in `api/src/index.ts`

**TypeScript config (frontend `frontend/tsconfig.json`):**
- `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- `jsx: react-jsx`, `noEmit: true`

**TypeScript config (API `api/tsconfig.json`):**
- `target: ES2020`, `module: commonjs`, `moduleResolution: node`
- `strict: true`, `esModuleInterop: true`
- Includes both `src/**/*` and `migrations/**/*`

---

## Infrastructure

**Docker Compose services (`docker-compose.yml`):**

| Service | Image / Build | Internal Port | Host Port | Env vars |
|---------|---------------|---------------|-----------|----------|
| `db` | `postgres:16` | 5432 | not exposed | `POSTGRES_USER/PASSWORD/DB=precious` |
| `api` | `./api` Dockerfile | 3001 | **4001** | `DATABASE_URL`, `NODE_ENV=development` |
| `frontend` | `./frontend` Dockerfile | 3000 | **4000** | `VITE_API_URL=http://api:3001` |

**Service dependencies:**
- `api` waits for `db` health check (`pg_isready -U precious -d precious`, 5s interval, 10 retries)
- `frontend` waits for `api`

**Persistent volumes:**
- `./data/db` → `/var/lib/postgresql/data` — PostgreSQL data files

**Hot-mount volumes (dev):**
- `api/src`, `api/migrations`, `api/tsconfig.json`
- `frontend/src`, `frontend/public`, `frontend/index.html`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/tailwind.config.ts`

**Make targets (`Makefile`):**
```bash
make dev        # docker compose up --build (foreground, hot-reload)
make up         # docker compose up --build -d (detached, production)
make down       # docker compose down
make clean      # docker compose down -v (destroys DB volume — full reset)
make logs-api   # docker compose logs -f api
make migrate    # docker compose exec api npm run migrate
```

---

## Design System

**Tailwind config (`frontend/tailwind.config.ts`):**
- `background`: `#F8FAFC`
- `primary.DEFAULT`: `#1E293B`; `primary.dim`: `#334155`
- `surface.*`: slate family (`#F8FAFC` bright → `#B0BEC5` highest)
- `error.DEFAULT`: `#9f403d`; `error.container`: `#fe8983`
- PWA theme/background: `#0b1326` (set in `frontend/vite.config.ts`)

**Fonts:** Manrope (display), Inter (body) — both self-hosted via `@fontsource`

---

## Monetary Column Convention

All money columns use `table.decimal('col', 20, 2)` → PostgreSQL `NUMERIC(20, 2)`. Enforced in `api/src/db.ts` comment block and repeated in every migration. **Never use `float` or `double` for monetary values.**

---

## v1 Constraints

- No auth — backend trusts all requests
- No live price feeds — all asset values entered manually (exception: `scraper/` populates dealer buy-back prices from hollandgold.nl)
- English only — no i18n
- PWA only — no native app
