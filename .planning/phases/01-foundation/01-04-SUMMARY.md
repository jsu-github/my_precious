# Phase 01-04 Summary: Docker + Makefile + Frontend Sources

**Status:** Complete
**Wave:** 2
**Commit:** b244ee9

## Artifacts Created

- `docker-compose.yml` — db (postgres:16 + healthcheck) + api (depends_on service_healthy) + frontend (depends_on api)
- `Makefile` — dev/up/down/clean/logs-api/migrate targets (TAB-indented)
- `.env.example` — DATABASE_URL, PORT, VITE_API_URL
- `.gitignore` — node_modules, dist, .env, data/db/, frontend/dist/
- `frontend/src/main.tsx` — StrictMode root mount
- `frontend/src/App.tsx` — Phase 1 placeholder (h1 + p)
- `frontend/src/index.css` — dark reset: bg #0b1326, color #f0f4ff
- `frontend/src/types.ts` — ApiError interface only; Phase 2 adds entity types
- `frontend/src/api.ts` — request<T>() helper; api object stub

## Key Configuration

### docker-compose critical settings
- `data/db:/var/lib/postgresql/data` — DB data persisted to host
- DB healthcheck: `pg_isready -U precious -d precious`, interval 5s, retries 10
- API: `api/src:/app/src` + `api/migrations:/app/migrations` volumes for hot-reload
- Frontend: `frontend/src:/app/src` + `frontend/public:/app/public` + `frontend/index.html:/app/index.html`
- `VITE_API_URL: http://api:3001` — Docker service name, not localhost

### Makefile commands
- `make dev` → `docker compose up --build`
- `make clean` → `docker compose down -v` (removes volumes)
- `make migrate` → `docker compose exec api npm run migrate`

### api.ts pattern
- All calls: `fetch('/api${path}', ...)` — proxy handles host resolution
- Error throw: `new Error(body.error?.message ?? 'Request failed')`
- Phase 2 adds entity namespaces: `api.assets`, `api.entities`, etc.
