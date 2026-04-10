.PHONY: dev up down clean logs-api migrate

dev:
	docker compose up --build

up:
	docker compose up --build -d

down:
	docker compose down

clean:
	docker compose down -v

logs-api:
	docker compose logs -f api

migrate:
	docker compose exec api npm run migrate
