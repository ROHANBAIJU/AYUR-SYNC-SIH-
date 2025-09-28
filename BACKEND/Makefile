# Makefile helpers for AYUR-SYNC backend
# Usage examples:
#   make start          # start stack (auto build if needed)
#   make start-full     # start + migrations + seed + wait + smoke
#   make reset          # destructive reset (drops volume)
#   make nuke           # global docker nuke (be careful)
#   make logs           # follow API logs
#   make smoke          # run smoke tests against running container
#   make migrate        # run idempotent ingestion definitions migration
#
# Variables:
#   SKIP_BUILD=1   make start
#   NO_CACHE=1     make start

POWERSHELL=pwsh

start:
	$(POWERSHELL) ./scripts/start_stack.ps1 $(if $(NO_CACHE),-NoCache,) $(if $(SKIP_BUILD),-SkipBuild,) -RunMigrations

start-full:
	$(POWERSHELL) ./scripts/start_stack.ps1 -RunMigrations -SeedData -WaitSetup -Smoke $(if $(NO_CACHE),-NoCache,)

reset:
	$(POWERSHELL) ./scripts/reset_stack.ps1

nuke:
	$(POWERSHELL) ./scripts/nuke_all_docker.ps1 -Force "NUKE ALL DOCKER"

logs:
	docker logs -f ayur-sync-api

smoke:
	docker exec ayur-sync-api python scripts/smoke_ingestion_new_fields.py
	docker exec ayur-sync-api python scripts/test_delete_endpoints.py

migrate:
	docker exec ayur-sync-api python scripts/migrate_add_ingestion_definitions.py

seed:
	docker exec ayur-sync-api python scripts/migrate_csv_to_db.py

.PHONY: start start-full reset nuke logs smoke migrate seed
