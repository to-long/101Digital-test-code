.PHONY: install up up-all down dev dev-be dev-fe migrate\:generate migrate seed setup lint format test test-e2e kill

install:
	bun install

up:
	docker compose up -d db

up-all:
	docker compose up -d --build

down:
	docker compose down

migrate\:generate:
	cd apps/be && bun run db:generate

dev: up
	bun run dev

dev-be:
	cd apps/be && bun run dev

dev-fe:
	cd apps/fe && bun run dev

migrate:
	cd apps/be && bun run db:migrate

seed:
	cd apps/be && bun run db:seed

setup: install up
	@echo "Waiting for database to be ready..."
	@sleep 3
	$(MAKE) migrate
	$(MAKE) seed

lint:
	bunx biome check .

format:
	bunx biome format --write .

test:
	cd apps/be && bun test

test-e2e:
	cd apps/fe && bun run test:e2e

kill:
	-lsof -ti:4001 | xargs kill -9 2>/dev/null
	-lsof -ti:3041 | xargs kill -9 2>/dev/null
