# Script: scripts/migrate_add_icd_code_column.py
# Purpose: Add `icd_code` column to `icd11_codes` table if it doesn't exist.
# Usage: Run once after pulling changes that add `icd_code` to the ORM model.

import os
import sys
import textwrap
from dotenv import load_dotenv
import psycopg2


def main():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set. Create a .env with DATABASE_URL and retry.")
        sys.exit(1)

    try:
        # psycopg2 accepts libpq-style URLs (postgres:// or postgresql://)
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
    except Exception as e:
        print(f"ERROR: Could not connect to database: {e}")
        sys.exit(2)

    try:
        with conn.cursor() as cur:
            # Check if column already exists
            cur.execute(
                textwrap.dedent(
                    """
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'icd11_codes'
                      AND column_name = 'icd_code'
                    """
                )
            )
            exists = cur.fetchone() is not None
            if exists:
                print("Column icd_code already exists on table icd11_codes. Nothing to do.")
                return

            # Add the column (safe if run twice due to check above)
            print("Adding column icd_code (VARCHAR(50)) to table icd11_codes…")
            cur.execute("ALTER TABLE public.icd11_codes ADD COLUMN icd_code VARCHAR(50);")
            print("Done. ✅")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
