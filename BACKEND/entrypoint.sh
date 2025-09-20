#!/usr/bin/env sh
set -e

echo "[ENTRYPOINT] Waiting for database to be ready..."
python - <<'PY'
import os, time, sys
import psycopg2

dsn = os.getenv("DATABASE_URL")
if not dsn:
    print("DATABASE_URL not set", file=sys.stderr)
    sys.exit(1)

for i in range(60):
    try:
        conn = psycopg2.connect(dsn)
        conn.close()
        print("DB is ready")
        break
    except Exception as e:
        print(f"Waiting for DB... {e}")
        time.sleep(2)
else:
    print("DB not ready after waiting", file=sys.stderr)
    sys.exit(1)
PY

echo "[ENTRYPOINT] Creating tables if not exist..."
python -m app.create_tables || echo "[ENTRYPOINT] create_tables finished (or skipped)."

# Ensure logs directory exists for FHIR audit
mkdir -p /app/logs || true

if [ -f /app/scripts/discover_ai_mappings.py ]; then
  echo "[ENTRYPOINT] Running AI mappings discovery..."
  python /app/scripts/discover_ai_mappings.py || echo "[ENTRYPOINT] discover_ai_mappings ended with non-zero status (continuing)."
else
  echo "[ENTRYPOINT] Skipping AI mappings discovery (script not found)."
fi

echo "[ENTRYPOINT] Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
