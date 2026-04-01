# Precious Dashboard

**Sovereign Risk Management for your portfolio.**

A personal portfolio tool that goes beyond tracking prices and ROI. Precious Dashboard helps you understand *how* you hold your assets — mapping counterparty exposure, liquidity risk, geographic concentration, and custom risk dimensions — so you can design a resilient portfolio, not just a profitable one.

## Quick Start

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd precious_dashboard

# 2. Create your environment file
make env

# 3. Start the stack
make up
```

The app is now running:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001
- **API Health:** http://localhost:3001/health

## Development (Hot Reload)

```bash
make dev
```

Both the API and frontend hot-reload on file changes.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite 5 (PWA) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 |
| Migrations | Knex.js |
| Runtime | Docker Compose |

## Architecture

```
precious_dashboard/
├── api/                    # Node.js/Express REST API
│   ├── src/
│   │   ├── index.ts        # Entry point — mounts middleware, runs migrations, starts server
│   │   ├── db.ts           # Knex singleton + runMigrations()
│   │   ├── routes/         # Route handlers
│   │   └── middleware/     # Express middleware (error handler, etc.)
│   ├── migrations/         # Knex migration files
│   ├── knexfile.ts         # DB connection config (reads DATABASE_URL)
│   ├── Dockerfile          # Multi-stage production build
│   └── Dockerfile.dev      # Dev image with hot reload
├── frontend/               # React SPA (installable PWA)
│   ├── src/
│   │   ├── main.tsx        # React entry — mounts App into #root
│   │   ├── App.tsx         # Root component
│   │   └── index.css       # Reset + base styles
│   ├── public/             # Static assets (icons, favicon)
│   ├── vite.config.ts      # Vite + PWA plugin config
│   ├── nginx.conf          # nginx config for SPA routing
│   ├── Dockerfile          # Multi-stage: Vite build → nginx serve
│   └── Dockerfile.dev      # Dev image (Vite dev server)
├── docker-compose.yml      # Production service definitions
├── docker-compose.dev.yml  # Dev overrides (volume mounts, hot reload)
├── Makefile                # Developer shortcuts
└── .env.example            # Environment variable template
```

## Environment Variables

Copy `.env.example` to `.env` (or run `make env`) and update:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `precious` | Database name |
| `POSTGRES_USER` | `precious` | Database user |
| `POSTGRES_PASSWORD` | `precious_secret_change_me` | **Change in production** |
| `API_PORT` | `3001` | API exposed port |
| `FRONTEND_PORT` | `3000` | Frontend exposed port |
| `VITE_API_URL` | `http://localhost:3001` | API URL (used by frontend) |

## Useful Commands

```bash
make up           # Start production stack (detached)
make dev          # Start dev stack with hot reload
make down         # Stop containers
make clean        # Stop containers + remove volumes (full reset)
make logs         # Tail all container logs
make logs-api     # Tail API logs only
make migrate      # Run DB migrations manually
make env          # Create .env from .env.example
```

## How Migrations Work

Migrations run **automatically at API startup**. On first `docker compose up`, Knex creates the `knex_migrations` tracking table and runs all files in `api/migrations/` in order. Subsequent startups only run new migrations.

To run manually: `make migrate`

## Design Philosophy

This app is built on **Intentional Minimalism**:
- Every element earns its place
- No feature creep — scope is locked to what matters for risk clarity
- **Data sovereignty:** your portfolio data stays on your machine, in your PostgreSQL instance

## License

Personal use.
