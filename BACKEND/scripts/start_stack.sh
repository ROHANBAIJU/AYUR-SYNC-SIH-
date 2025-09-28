#!/usr/bin/env bash
set -euo pipefail
# Cross-platform bash version of start_stack.ps1
# Features: auto-build, optional migrations, seeding, smoke tests, log follow.
# Usage examples:
#  ./scripts/start_stack.sh --migrations --seed --smoke --wait-setup --follow
# Flags:
#   --no-cache     : Build without cache
#   --skip-build   : Skip build if images exist
#   --force-build  : Force build even if image present
#   --recreate     : Force recreate containers
#   --migrations   : Run idempotent DB migration script
#   --seed         : Run data seeding script
#   --smoke        : Run smoke tests after start
#   --wait-setup   : Wait for background setup completion line
#   --follow       : Follow API logs
#
# NOTE: Non-destructive (does not drop volumes). Use reset script for wipe.

NO_CACHE=false
SKIP_BUILD=false
FORCE_BUILD=false
RECREATE=false
RUN_MIGRATIONS=false
SEED_DATA=false
SMOKE=false
WAIT_SETUP=false
FOLLOW=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-cache) NO_CACHE=true ; shift ;;
    --skip-build) SKIP_BUILD=true ; shift ;;
    --force-build) FORCE_BUILD=true ; shift ;;
    --recreate) RECREATE=true ; shift ;;
    --migrations) RUN_MIGRATIONS=true ; shift ;;
    --seed) SEED_DATA=true ; shift ;;
    --smoke) SMOKE=true ; shift ;;
    --wait-setup) WAIT_SETUP=true ; shift ;;
    --follow) FOLLOW=true ; shift ;;
    *) echo "[WARN] Unknown flag $1" ; shift ;;
  esac
done

function section(){ echo -e "\n==== $* ====\n"; }

section Pre-flight
command -v docker >/dev/null || { echo "[ERR] docker not found"; exit 1; }
if ! docker compose version >/dev/null 2>&1; then
  echo "[ERR] docker compose plugin not available"; exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( realpath "${SCRIPT_DIR}/.." )"
cd "$BACKEND_DIR"
[[ -f docker-compose.yml ]] || { echo "[ERR] docker-compose.yml missing"; exit 1; }

echo "[INFO] Working directory: $BACKEND_DIR"

function image_exists(){ docker image inspect ayur-sync-api:latest >/dev/null 2>&1; }

section Build
MUST_BUILD=false
if $FORCE_BUILD; then MUST_BUILD=true; fi
if ! image_exists; then echo "[INFO] API image missing -> build required"; MUST_BUILD=true; fi
if $SKIP_BUILD && ! $MUST_BUILD; then
  echo "[WARN] Skipping build (user chose --skip-build)"
else
  if $SKIP_BUILD && $MUST_BUILD; then echo "[WARN] --skip-build ignored (build required)"; fi
  BUILD_CMD=(docker compose build)
  $NO_CACHE && BUILD_CMD+=(--no-cache)
  echo "[INFO] Running: ${BUILD_CMD[*]}"
  "${BUILD_CMD[@]}"
fi

section Start
UP_CMD=(docker compose up -d)
$RECREATE && UP_CMD+=(--force-recreate)
"${UP_CMD[@]}"

echo "[INFO] Waiting for Postgres health..."
MAX_WAIT=180
ELAPSED=0
while true; do
  STATUS=$(docker inspect ayur-sync-db --format '{{json .State.Health.Status}}' 2>/dev/null || true)
  if [[ -z "$STATUS" ]]; then
    echo "[WARN] DB container not yet present..."; sleep 2; ELAPSED=$((ELAPSED+2))
  else
    STATUS=${STATUS//"/}
    echo "[INFO] DB Health: $STATUS"
    [[ "$STATUS" == healthy ]] && break
    sleep 3; ELAPSED=$((ELAPSED+3))
  fi
  if (( ELAPSED >= MAX_WAIT )); then
    echo "[ERR] Timed out waiting for DB health"; exit 1
  fi
done

if $RUN_MIGRATIONS; then
  section Migrations
  docker exec ayur-sync-api python scripts/migrate_add_ingestion_definitions.py || echo "[WARN] Migration script failed"
fi

if $SEED_DATA; then
  section Seeding
  if [[ -f scripts/migrate_csv_to_db.py ]]; then
    docker exec ayur-sync-api python scripts/migrate_csv_to_db.py || echo "[WARN] Seeding failed"
  else
    echo "[WARN] migrate_csv_to_db.py not found"
  fi
fi

if $WAIT_SETUP; then
  section Wait_Setup
  TIMEOUT=300; P=0
  while (( P < TIMEOUT )); do
    if docker logs ayur-sync-api --tail 50 2>/dev/null | grep -q "\[SETUP\] All setup tasks complete"; then
      echo "[INFO] Background setup completed"; break
    fi
    sleep 3; P=$((P+3))
  done
  (( P >= TIMEOUT )) && echo "[WARN] Timed out waiting for background setup"
fi

section Status
docker ps --filter name=ayur-sync --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

section Recent_API_Logs
docker logs --tail 60 ayur-sync-api 2>/dev/null || true

if $SMOKE; then
  section Smoke_Tests
  docker exec ayur-sync-api python scripts/smoke_ingestion_new_fields.py || echo "[WARN] ingestion smoke failed"
  docker exec ayur-sync-api python scripts/test_delete_endpoints.py || echo "[WARN] delete endpoints smoke failed"
fi

if $FOLLOW; then
  section Following_Logs
  docker logs -f ayur-sync-api
fi

echo "[INFO] Done."
