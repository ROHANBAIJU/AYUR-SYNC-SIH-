#!/usr/bin/env python
"""One-off migration: add short/long definition and vernacular columns to ingestion_rows.
Idempotent: checks for column existence before altering.
Run inside container:
    docker exec ayur-sync-api python scripts/migrate_add_ingestion_definitions.py

Implementation note:
The initial version imported ``engine`` from ``app.db.session`` but failed during early
startup (ModuleNotFoundError: app) in the background setup process for some environments.
To make this script more robust and decoupled from package import timing, we construct a new
SQLAlchemy engine directly from ``DATABASE_URL``.
"""
import os
import sys
from sqlalchemy import inspect, text, create_engine

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
        print("[MIGRATION] ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

engine = create_engine(DATABASE_URL)

NEW_COLUMNS = [
    ("short_definition", "TEXT"),
    ("long_definition", "TEXT"),
    ("vernacular_term", "TEXT")
]

def column_exists(inspector, table, column):
    for col in inspector.get_columns(table):
        if col['name'] == column:
            return True
    return False

with engine.begin() as conn:
    insp = inspect(conn)
    for name, ddl_type in NEW_COLUMNS:
        if not column_exists(insp, 'ingestion_rows', name):
            print(f"[MIGRATION] Adding column {name}...")
            conn.execute(text(f'ALTER TABLE ingestion_rows ADD COLUMN {name} {ddl_type}'))
        else:
            print(f"[MIGRATION] Column {name} already exists; skipping.")
print("[MIGRATION] Done.")
