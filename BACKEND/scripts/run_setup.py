# In scripts/run_setup.py
import os
import sys
import time
import subprocess
import psycopg2

def wait_for_db():
    """Waits for the database to become available."""
    print("[SETUP] Waiting for database to be ready...")
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        print("[SETUP] ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    for i in range(60): # Try for 2 minutes
        try:
            conn = psycopg2.connect(dsn)
            conn.close()
            print("[SETUP] DB is ready")
            return
        except Exception as e:
            print(f"[SETUP] Waiting for DB... attempt {i+1}/60")
            time.sleep(2)
    
    print("[SETUP] ERROR: DB not ready after waiting", file=sys.stderr)
    sys.exit(1)

def create_tables():
    """Runs the table creation script."""
    print("[SETUP] Creating tables if not exist...")
    # This runs the command: python -m app.create_tables
    subprocess.run(["python", "-m", "app.create_tables"], check=False)
    print("[SETUP] create_tables finished.")

def run_ai_discovery():
    """Optionally runs the AI discovery script."""
    skip_flag = os.getenv("SKIP_AI_DISCOVERY", "false").lower()
    if skip_flag in ["1", "true"]:
        print("[SETUP] SKIP_AI_DISCOVERY is set; skipping AI mappings discovery.")
        # Try fast-path CSV loader instead when discovery is skipped
        try:
            from scripts.load_suggestions_from_csv import _resolve_csv_path, load_suggestions
            csv_path = _resolve_csv_path()
            if csv_path:
                print(f"[SETUP] Seeding suggestions from CSV: {csv_path}")
                load_suggestions()
            else:
                print("[SETUP] No suggestions CSV found to seed from.")
        except Exception as e:
            print(f"[SETUP] CSV seeding failed: {e}")
        return

    script_path = "/app/scripts/discover_ai_mappings.py"
    if os.path.exists(script_path):
        print("[SETUP] Running AI mappings discovery...")
        # This runs the command: python /app/scripts/discover_ai_mappings.py
        subprocess.run(["python", script_path], check=False)
        print("[SETUP] discover_ai_mappings finished.")
    else:
        print("[SETUP] Skipping AI mappings discovery (script not found).")

if __name__ == "__main__":
    wait_for_db()
    create_tables()
    run_ai_discovery()
    print("[SETUP] All setup tasks complete! ✅")