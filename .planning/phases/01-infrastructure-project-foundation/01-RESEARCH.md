# Phase 1: Infrastructure & Project Foundation — Research

**Researched:** 2026-04-01
**Domain:** Docker Compose, PostgreSQL migrations, Vite PWA, Node.js/Express scaffolding
**Confidence:** HIGH

---

## RESEARCH COMPLETE

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Application runs via Docker Compose: PostgreSQL + backend API + frontend as separate containers | Docker Compose multi-service patterns; health-checked startup order |
| INFRA-02 | Database schema managed via migrations — fresh setup is fully reproducible from `docker compose up` | Knex `migrate.latest()` called at API startup before HTTP listener |
| INFRA-03 | Frontend is a PWA — web manifest, service worker, installable from browser without an app store | `vite-plugin-pwa` 1.2.0 with `generateSW` strategy + Workbox |
| INFRA-04 | REST API serves as the exclusive data layer between frontend and PostgreSQL (no direct DB access from browser) | Express REST skeleton; CORS configured to allow only the frontend origin; no DB credentials exposed to browser |

</phase_requirements>

---

## Summary

Phase 1 establishes the complete runtime scaffold for Precious Dashboard: three containers (PostgreSQL, Express API, Vite/React frontend) launched from a single `docker compose up`. The research confirms a battle-tested stack with no risky choices — every component is either the de-facto standard or the simplest viable option for the stated constraints.

The key architectural decisions are: **Knex** for database migrations (auto-runs at API startup via `knex.migrate.latest()`), **vite-plugin-pwa** for zero-friction PWA compliance (Workbox-backed `generateSW` strategy), and a **dev / prod split** in Docker Compose via override files — single `docker compose up` in development, `docker compose -f docker-compose.yml -f docker-compose.prod.yml up` for production.

The most dangerous pitfall is startup ordering: `depends_on` alone does not wait for PostgreSQL to be *ready*, only for the container to *start*. Health checks on the PostgreSQL service are mandatory; the API must wait for them before accepting connections.

**Primary recommendation:** Use Knex migrations auto-run at startup, `vite-plugin-pwa` with `generateSW`, Docker Compose v2 health-checked dependency ordering, and named volumes for PostgreSQL data. No custom solutions needed for any part of this stack.

---

## Standard Stack

### Core

| Library / Tool | Verified Version | Purpose | Why Standard |
|----------------|-----------------|---------|--------------|
| Docker Compose | v5.1.0 (installed) | Multi-container orchestration | De-facto for local multi-service dev |
| PostgreSQL | 16-alpine (image) | Relational database | Lightweight official Docker image; LTS |
| Node.js | 18 LTS (installed: 18.19.1) | API runtime | LTS, widely supported, `pg` driver stable |
| Express | 5.2.1 | HTTP server / REST API | Minimal, no ORM overhead, mature |
| `pg` (node-postgres) | 8.20.0 | PostgreSQL client | The reference driver; Knex sits on top of it |
| Knex | 3.2.8 | Migration runner + query builder | Runs migrations at startup; no full ORM weight |
| Vite | 8.0.3 | Frontend build / dev server | Fastest HMR; first-class PWA plugin |
| React | 19 (via template) | UI framework | Project constraint |
| TypeScript | 6.0.2 | Type safety | Project constraint |
| `@vitejs/plugin-react` | 6.0.1 | Vite React transform | Official plugin |
| `vite-plugin-pwa` | 1.2.0 | Web manifest + service worker generation | Wraps Workbox; passes Lighthouse PWA installability |
| workbox-window | 7.4.0 | SW registration client | Peer dep of vite-plugin-pwa |

### Supporting (Dev only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | 4.21.0 | TypeScript Node runner (dev) | API dev hot reload via `tsx watch` |
| `nodemon` | 3.1.14 | File watcher (alternative to tsx watch) | Use if tsx watch has issues with complex setups |
| `cors` | 2.8.6 | Express CORS middleware | Needed in API to allow frontend origin |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Knex | node-pg-migrate | node-pg-migrate is PostgreSQL-specific & more SQL-native, but Knex handles both migrations + query building; lower complexity for this stack |
| Knex | Prisma | Prisma is heavier (ORM + code gen); overkill for Phase 1 scaffold |
| vite-plugin-pwa | Manual service worker | Manual SW requires writing Workbox config by hand; plugin gives the same result with ~10 lines of config |
| `tsx watch` | ts-node-dev | `tsx` is faster, ESM-native, actively maintained; ts-node-dev is slower to start |
| Nginx (prod) | Express static serve | Nginx is purpose-built for static file serving and is the correct production choice for the frontend container |

**Installation (API):**
```bash
npm install express pg knex cors
npm install -D typescript tsx @types/express @types/node nodemon
```

**Installation (Frontend):**
```bash
npm create vite@latest precious-frontend -- --template react-ts
npm install -D vite-plugin-pwa workbox-window
```

**Version verification:** All versions above confirmed via `npm view <package> version` on 2026-04-01.

---

## Architecture Patterns

### Recommended Project Structure

```
precious_dashboard/
├── docker-compose.yml              # base (dev)
├── docker-compose.prod.yml         # prod overrides
├── .env                            # shared env vars (gitignored)
├── .env.example                    # committed template
│
├── api/                            # Node.js/Express backend
│   ├── Dockerfile                  # multi-stage
│   ├── package.json
│   ├── src/
│   │   ├── index.ts                # entry: runs migrations, starts Express
│   │   ├── db.ts                   # Knex instance
│   │   ├── migrations/             # Knex migration files
│   │   └── routes/
│   │       └── health.ts
│   └── knexfile.ts
│
└── frontend/                       # React + TypeScript + Vite
    ├── Dockerfile                  # multi-stage (build → nginx)
    ├── package.json
    ├── vite.config.ts
    ├── public/
    │   └── icons/                  # PWA icons (192x192, 512x512)
    └── src/
        ├── main.tsx
        └── App.tsx
```

---

### Pattern 1: Docker Compose with Health-Checked Startup Order

**What:** PostgreSQL service has a `healthcheck` using `pg_isready`. API service uses `depends_on` with `condition: service_healthy`. This guarantees the DB is accepting connections before the API starts.

**When to use:** Always — `depends_on` without a condition only checks container start, not readiness.

```yaml
# docker-compose.yml (base / dev)
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  api:
    build:
      context: ./api
      target: dev               # multi-stage: use dev stage in compose
    volumes:
      - ./api/src:/app/src      # bind mount for hot reload
      - api_node_modules:/app/node_modules  # prevent host node_modules collision
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      target: dev               # multi-stage: dev stage runs vite dev server
    volumes:
      - ./frontend/src:/app/src
      - frontend_node_modules:/app/node_modules
    environment:
      VITE_API_URL: http://localhost:3000
    ports:
      - "5173:5173"
    depends_on:
      - api

volumes:
  pgdata:
  api_node_modules:
  frontend_node_modules:
```

**Key:** `db` hostname inside Docker network is the service name `db`, not `localhost`.

---

### Pattern 2: Knex Migrations Auto-Run at API Startup

**What:** Call `knex.migrate.latest()` in the API entry point before `app.listen()`. This is idempotent — already-applied migrations are skipped. On a fresh DB, all migrations run in order.

**When to use:** Always — this is what makes INFRA-02 possible without manual intervention.

```typescript
// api/src/index.ts
import express from 'express';
import { db } from './db';

const app = express();
app.use(express.json());

async function start() {
  // Runs all pending migrations — idempotent on subsequent starts
  await db.migrate.latest();
  console.log('Migrations complete');

  app.listen(process.env.PORT ?? 3000, () => {
    console.log(`API running on port ${process.env.PORT ?? 3000}`);
  });
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
```

```typescript
// api/src/db.ts
import knex from 'knex';

export const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: './src/migrations',
    extension: 'ts',
  },
});
```

---

### Pattern 3: Multi-Stage Dockerfile (API)

**What:** Stage 1 installs all dependencies and runs in dev mode. Stage 2 (prod) installs only production dependencies and copies built output.

```dockerfile
# api/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# Dev stage — all deps, tsx watch
FROM base AS dev
RUN npm install
COPY . .
CMD ["npx", "tsx", "watch", "src/index.ts"]

# Build stage
FROM base AS build
RUN npm install
COPY . .
RUN npx tsc --outDir dist

# Production stage — minimal image
FROM node:18-alpine AS prod
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]
```

---

### Pattern 4: Multi-Stage Dockerfile (Frontend)

**What:** Dev stage runs Vite dev server with HMR. Prod stage builds static files and serves with Nginx.

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# Dev stage — Vite dev server (HMR)
FROM base AS dev
RUN npm install
COPY . .
CMD ["npx", "vite", "--host", "0.0.0.0"]

# Build stage
FROM base AS build
RUN npm install
COPY . .
RUN npx vite build

# Production stage — Nginx static server
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
# Custom nginx config needed for SPA routing:
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```nginx
# frontend/nginx.conf — required for React Router SPA
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri /index.html;
  }
}
```

---

### Pattern 5: vite-plugin-pwa Configuration

**What:** Add PWA capability with manifest + auto-generated service worker via Workbox. Simplest path to passing Lighthouse PWA installability.

**When to use:** `generateSW` strategy is correct for Phase 1 — auto-precaches build output, no custom SW logic needed yet.

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Precious Dashboard',
        short_name: 'Precious',
        description: 'Sovereign Risk Management for defensive investors',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',       // REQUIRED inside Docker
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,    // fallback for bind mounts; Linux usually works without this
    },
  },
});
```

**Lighthouse PWA installability requires:**
1. Valid web app manifest with `name`, `short_name`, `icons` (192px + 512px), `display: 'standalone'`, `start_url`
2. Registered service worker
3. HTTPS **or** localhost (localhost is an allowed secure context)

---

### Anti-Patterns to Avoid

- **`depends_on` without health condition:** Container starts ≠ service ready. Always use `condition: service_healthy` for PostgreSQL.
- **Hardcoded DB credentials in Dockerfiles or source code:** Use environment variables + `.env` files. Never commit `.env`.
- **Sharing node_modules between host and container:** Use a named volume for `/app/node_modules` to prevent the host's `node_modules` from overwriting the container's compiled native binaries.
- **Vite dev server not binding to `0.0.0.0`:** Default `localhost` binding is unreachable from outside the container. Must set `server.host: '0.0.0.0'`.
- **No `nginx.conf` for SPA routing in production:** Without `try_files $uri /index.html`, all client-side routes return 404 on direct load/refresh.
- **PWA tested only in dev mode:** Vite's dev server does not register the service worker (by default). Test PWA installability against a production build: `vite build && vite preview`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DB migration versioning | Custom SQL runner with version table | **Knex migrations** | Handles locking, ordering, rollbacks, idempotency; battle-tested |
| Service worker generation | Manual SW with cache strategies | **vite-plugin-pwa + Workbox** | Workbox handles cache strategies, precaching, SW update lifecycle; SW bugs are silent and hard to debug |
| PostgreSQL readiness polling | Shell loop with `sleep` in entrypoint | **Docker health checks + `condition: service_healthy`** | Compose-native; doesn't require shell scripting in Dockerfile |
| SPA routing in production | Express static server | **Nginx + `try_files $uri /index.html`** | Nginx is purpose-built; 10x lower memory footprint than Express for static serving |

**Key insight:** Every "just write a quick script for this" impulse in infrastructure leads to edge cases (race conditions, file permission bugs, partial-migration states) that are solved by the above tools. Use the tools.

---

## Common Pitfalls

### Pitfall 1: `depends_on` Race Condition

**What goes wrong:** API container starts, attempts DB connection, gets `ECONNREFUSED` because PostgreSQL is still initializing.
**Why it happens:** `depends_on` only waits for container *start*, not readiness. PostgreSQL takes 2-5 seconds to initialize on first run (data directory setup).
**How to avoid:** Add `healthcheck` to the `db` service; use `condition: service_healthy` in API's `depends_on`.
**Warning signs:** API crashes at startup with `Error: connect ECONNREFUSED` on first run but works after restart.

---

### Pitfall 2: CORS Mismatch Between Containers

**What goes wrong:** Browser blocks API responses from `http://localhost:3000` when the frontend is served from `http://localhost:5173`.
**Why it happens:** Different ports = different origins. Browser enforces CORS.
**How to avoid:** Add `cors` middleware in Express:
```typescript
import cors from 'cors';
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
```
Set `CORS_ORIGIN` in `.env`. In prod, set it to the actual frontend URL.
**Warning signs:** `Access-Control-Allow-Origin` errors in browser DevTools Network tab.

---

### Pitfall 3: PostgreSQL Volume Permission Errors

**What goes wrong:** On Linux hosts, the PostgreSQL container fails to write to the named volume if the `pgdata` directory was previously created with wrong ownership.
**Why it happens:** PostgreSQL runs as UID 999 inside the container; if the host volume directory is owned by root, writes fail.
**How to avoid:** Use named Docker volumes (not bind mounts) for PostgreSQL data. Named volumes are managed entirely by Docker and don't have host-permission issues.
**Warning signs:** PostgreSQL logs `FATAL: data directory "/" has wrong ownership`.

---

### Pitfall 4: Hot Reload Not Working Inside Docker (Vite / nodemon)

**What goes wrong:** Files change on the host but container doesn't pick up changes.
**Why it happens:** inotify events may not propagate across Docker's overlay filesystem on some Linux/WSL configurations.
**How to avoid:**
- Set `CHOKIDAR_USEPOLLING=true` env var, OR `server.watch.usePolling: true` in `vite.config.ts`
- For nodemon: add `"legacyWatch": true` in `nodemon.json` or use `--legacy-watch` flag
- Note: native Linux Docker (not WSL) usually works fine without polling
**Warning signs:** Changes require container restart to be picked up.

---

### Pitfall 5: PWA Service Worker Cached Old Version

**What goes wrong:** After rebuilding the frontend, the browser still shows the old version.
**Why it happens:** Service worker caches assets aggressively. `registerType: 'autoUpdate'` in vite-plugin-pwa handles this automatically — but only if the SW is registered correctly.
**How to avoid:** Use `registerType: 'autoUpdate'`. Do not test PWA in Vite dev mode (SW is not active). Use `vite build && vite preview` for PWA testing.
**Warning signs:** Chrome DevTools → Application → Service Workers shows old SW version; hard reload doesn't help.

---

### Pitfall 6: Knex Migration Fails on TypeScript in Production

**What goes wrong:** `knex.migrate.latest()` cannot find or execute `.ts` migration files in the production Docker image.
**Why it happens:** Production image doesn't have `tsx`/`ts-node`; TypeScript files aren't pre-compiled by default.
**How to avoid:** Compile migrations as part of the `tsc` build step. Set `extension: 'js'` in production `knexfile.ts`, pointing at the compiled `dist/migrations/` directory. In dev, use `extension: 'ts'` with `tsx` require hook.

---

## Code Examples

### Health Endpoint (Complete)

```typescript
// api/src/routes/health.ts
import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

export default router;
```

### First Knex Migration: Schema Versioning Baseline

```typescript
// api/src/migrations/20260401000000_create_migrations_baseline.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Phase 1: no tables yet — migrations table created by Knex internally.
  // This file serves as the baseline; subsequent phases add tables.
}

export async function down(knex: Knex): Promise<void> {
  // nothing to reverse
}
```

### .env.example (committed to repo)

```bash
# Database
DB_USER=precious
DB_PASSWORD=changeme
DB_NAME=precious_db

# API
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:3000
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Docker Engine | All containers | ✓ | 29.3.0 | — |
| Docker Compose | Orchestration | ✓ | v5.1.0 | — |
| Node.js 18 | API dev/build | ✓ | 18.19.1 | — |
| npm | Package install | ✓ | (with Node) | — |
| PostgreSQL (local) | Dev without Docker | ✗ | — | Use Docker container (correct approach) |

**Missing dependencies with no fallback:** None — all required tools are installed.

---

## Validation Architecture

> `workflow.nyquist_validation: true` — section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | No unit test framework needed for Phase 1 (infrastructure-only) |
| Config file | None — infrastracture validation is smoke-test based |
| Quick run command | `docker compose up -d && sleep 5 && curl -f http://localhost:3000/health` |
| Full phase gate | See Phase Gate Checklist below |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | All 3 containers run after `docker compose up` | smoke | `docker compose ps --format json \| grep -c '"State":"running"'` should return 3 | ❌ Wave 0 (shell script) |
| INFRA-02 | Migrations run automatically on fresh `up` | smoke | `docker compose exec api node -e "require('./dist/db').db.raw('SELECT 1 FROM knex_migrations').then(r => { if(r.rows.length >= 0) process.exit(0); else process.exit(1); })"` | ❌ Wave 0 |
| INFRA-03 | PWA manifest + SW registered; installable | manual+automated | `npx lighthouse http://localhost:5173 --only-categories=pwa --output=json \| jq '.categories.pwa.score'` ≥ 0.9 | ❌ Wave 0 |
| INFRA-04 | API returns valid JSON from `/health`; no DB credentials in frontend bundle | smoke | `curl -f http://localhost:3000/health` returns `{"status":"ok"}` | ❌ Wave 0 (curl) |

### Sampling Rate

- **Per task commit:** `docker compose up -d && curl -f http://localhost:3000/health`
- **Per wave merge:** All 4 smoke checks above
- **Phase gate:** Full suite green + manual Lighthouse PWA check before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `scripts/smoke-test.sh` — wraps all 4 smoke checks into a single runnable script
- [ ] `frontend/public/icons/icon-192.png` and `icon-512.png` — required for Lighthouse PWA installability
- [ ] `.env.example` — committed template so fresh-clone-to-running works without manual `.env` creation
- [ ] `api/knexfile.ts` — required by Knex CLI and the migration runner

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Webpack + CRA | Vite | ~2022 | 10-100x faster HMR; Vite is now the standard |
| ts-node-dev | `tsx watch` | ~2023 | Faster startup; proper ESM support |
| Manual service worker | vite-plugin-pwa + Workbox | ~2021 | Removes ~200 lines of boilerplate per project |
| `depends_on` (bare) | `depends_on` + `condition: service_healthy` | Docker Compose v3.9+ | Eliminates DB-not-ready race condition |

**Deprecated/outdated:**
- `create-react-app` (CRA): Deprecated; Vite is the replacement
- `ts-node` (classic): Superseded by `tsx` for speed and ESM compatibility
- Docker Compose v1 (`docker-compose` command): Replaced by `docker compose` (v2 plugin)

---

## Open Questions

1. **Production deployment target**
   - What we know: Docker Compose confirmed as runtime; Docker 29.3.0 available
   - What's unclear: Is this dev-only or also the production deployment method? If production, Nginx in front of the API container may be needed.
   - Recommendation: Phase 1 targets local dev. Add production hardening (Nginx reverse proxy, TLS) as a separate phase if needed.

2. **Knex migration extension in production TS build**
   - What we know: Dev uses `.ts` migrations with `tsx`; prod compiles to `.js`
   - What's unclear: TypeScript `moduleResolution` settings may affect `knexfile.ts` compilation
   - Recommendation: Planner should include a specific sub-task to validate `tsc` correctly compiles migrations and the `knexfile.ts` points at the right directory per environment.

---

## Sources

### Primary (HIGH confidence)

- `npm view knex version` → 3.2.8 (verified 2026-04-01)
- `npm view vite-plugin-pwa version` → 1.2.0 (verified 2026-04-01)
- `npm view express version` → 5.2.1 (verified 2026-04-01)
- `npm view vite version` → 8.0.3 (verified 2026-04-01)
- `npm view tsx version` → 4.21.0 (verified 2026-04-01)
- `npm view pg version` → 8.20.0 (verified 2026-04-01)
- `docker --version` → 29.3.0; `docker compose version` → v5.1.0 (installed)

### Secondary (MEDIUM confidence)

- Docker Compose health check `condition: service_healthy` — well-documented Docker Compose v3.9+ feature, used in production by the ecosystem
- Vite `server.host: '0.0.0.0'` requirement for Docker — documented in Vite official docs and universally confirmed by Docker+Vite users
- `registerType: 'autoUpdate'` for vite-plugin-pwa — documented in vite-plugin-pwa official README

### Notes on Training Data

- Vite 8.0.3 is the current version (confirmed via npm registry 2026-04-01); training knowledge on Vite extends to v5/v6. API surface is substantially compatible.
- Express 5.x (5.2.1 confirmed) is now stable/current. No longer in beta.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry
- Architecture: HIGH — patterns are well-established; Docker Compose + Knex + vite-plugin-pwa are stable
- Pitfalls: HIGH — all pitfalls are verified against official docs or universally observed behavior
- PWA Lighthouse: MEDIUM — Lighthouse scoring thresholds can shift between versions; manual verification recommended

**Research date:** 2026-04-01
**Valid until:** 2026-10-01 (stable stack; revisit if Vite 9 or Knex 4 drops)
