.PHONY: dev deps up down

dev:
	@echo "Use frontend and backend commands from README.md"

deps:
	docker compose up -d postgres redis

up:
	docker compose up -d

down:
	docker compose down
