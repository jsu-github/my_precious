# STACK.md — Technology Stack

## Status: Pre-Implementation

No application code exists yet. The stack below is **specified** in the PRD and `.github/copilot-instructions.md` and confirmed by the `.stitch/` screen mockups. Implementation has not begun.

---

## Planned Application Stack

### Frontend
| Concern | Technology |
|---------|-----------|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS (custom token extension) |
| Icons | Material Symbols Outlined (Google Fonts CDN) |
| Typography | Newsreader (serif) + Inter (sans) via Google Fonts |
| PWA | Yes — installable |
| Port | 3000 |

### API
| Concern | Technology |
|---------|-----------|
| Runtime | Node.js |
| Framework | Express + TypeScript |
| Port | 3001 (copilot-instructions) / 3040 (PRD — discrepancy to resolve) |

### Database
| Concern | Technology |
|---------|-----------|
| Engine | PostgreSQL 16 |
| Query layer | Knex.js (migrations + query builder) |

### Runtime
| Concern | Technology |
|---------|-----------|
| Orchestration | Docker Compose |
| Dev workflow | `make dev` (hot reload) |
| Prod workflow | `make up` (detached) |

---

## Confirmed via Screen Mockups (.stitch/screens/)

The six HTML screen mocks use these CDN dependencies:
- `https://cdn.tailwindcss.com?plugins=forms,container-queries` (Tailwind CSS Play CDN)
- Google Fonts: `Inter:wght@300;400;500;600;700` + `Newsreader:ital,opsz,wght@...`
- Google Fonts: `Material+Symbols+Outlined`

These are **reference only** (CDN-loaded mockups). The production app will bundle Tailwind via Vite.

---

## Design System Tokens (`.stitch/design-system/midnight-sovereign.json`)

| Token | Value |
|-------|-------|
| Color mode | DARK |
| Primary (Gold) | `#e9c349` |
| Secondary (Emerald) | `#4edea3` |
| Tertiary (Slate) | `#b9c7e0` |
| Background | `#0b1326` |
| Surface low | `#131b2e` |
| Surface high | `#222a3d` |
| Surface highest | `#2d3449` |
| Error | `#ffb4ab` |
| Headline font | Newsreader |
| Body/label font | Inter |
| Roundness | ROUND_FOUR (`border-radius: 4px` base) |
| Spacing scale | 3 |

---

## Development Commands (from `.github/copilot-instructions.md`)

```bash
make dev        # Full stack hot reload (frontend :3000, API :3001)
make up         # Production stack (detached)
make down       # Stop containers
make clean      # Stop + remove volumes (full reset)
make logs-api   # Tail API logs
make migrate    # Run DB migrations manually
```

---

## Configuration Notes

- No auth — single-user personal tool; backend trusts all requests
- No live price feeds in v1 — all asset values entered manually (PRD lists live prices as a feature, instructions say manual; this is a v1 constraint to resolve)
- No i18n — English only
- No mobile-native app — PWA only
