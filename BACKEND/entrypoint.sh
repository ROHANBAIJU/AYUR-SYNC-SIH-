#!/usr/bin/env sh
set -e

# Run the entire setup process in the background
# The '&' at the end is the crucial part that does this.
echo "[ENTRYPOINT] Starting setup tasks in the background..."
python scripts/run_setup.py &

# Immediately start the API server in the foreground
# This is what Render's health check will see.
echo "[ENTRYPOINT] Starting API server..."
PORT="${PORT:-10000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"