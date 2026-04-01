.PHONY: up up-build dev dev-build down clean logs logs-api logs-frontend ps migrate env help

# Production stack
up:
	docker compose up -d

up-build:
	docker compose up -d --build

# Development stack (hot reload)
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

dev-build:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Teardown
down:
	docker compose down

clean:
	docker compose down -v --remove-orphans

# Monitoring
logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-frontend:
	docker compose logs -f frontend

ps:
	docker compose ps

# Database
migrate:
	docker compose exec api npm run migrate

# Copy .env.example to .env if not already present
env:
	@test -f .env || (cp .env.example .env && echo "✓ Created .env from .env.example — update passwords before production use")

help:
	@echo ""
	@echo "Precious Dashboard — Available targets:"
	@echo ""
	@echo "  make up          Start production stack (detached)"
	@echo "  make up-build    Start production stack and rebuild images"
	@echo "  make dev         Start development stack (hot reload, foreground)"
	@echo "  make down        Stop all containers"
	@echo "  make clean       Stop containers and remove volumes"
	@echo "  make logs        Tail all container logs"
	@echo "  make logs-api    Tail API logs only"
	@echo "  make migrate     Run DB migrations manually"
	@echo "  make env         Create .env from .env.example"
	@echo ""
