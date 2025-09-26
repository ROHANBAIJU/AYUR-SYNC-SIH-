"""Manual migration script for Phase 2 enhancements.
Run once inside the backend container (after building) with:
  python -m scripts.manual_migration_phase2
The script is idempotent: it checks for column/table existence before altering.
"""
from sqlalchemy import text, inspect
from app.db.session import SessionLocal, engine

NEW_COLUMNS = [
    ("icd11_codes", "tm2_code", "VARCHAR(50)"),
    ("icd11_codes", "tm2_title", "TEXT"),
    ("icd11_codes", "tm2_definition", "TEXT"),
    ("diagnosis_events", "icd_code_used", "VARCHAR(50)"),
    ("diagnosis_events", "tm2_code", "VARCHAR(50)"),
    ("diagnosis_events", "patient_id", "VARCHAR(100)"),
    ("diagnosis_events", "release_version", "VARCHAR(50)"),
    ("consents", "scope", "VARCHAR(100) DEFAULT 'terminology'"),
    ("consents", "patient_id", "VARCHAR(100)"),
]

CREATE_EXTERNAL_TABLE = """
CREATE TABLE IF NOT EXISTS external_code_links (
    id SERIAL PRIMARY KEY,
    system VARCHAR(50) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_code VARCHAR(100) NOT NULL,
    external_code VARCHAR(100) NOT NULL,
    display VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

SEED_EXTERNAL = [
    ("snomed", "icd11", "Dengue fever", "38362002", "Dengue fever (disorder)"),
    ("snomed", "icd11", "Abdominal distension", "162046002", "Abdominal distension (finding)"),
]


def column_exists(inspector, table, column):
    for col in inspector.get_columns(table):
        if col['name'] == column:
            return True
    return False


def main():
    insp = inspect(engine)
    with engine.connect() as conn:
        # Add new columns
        for table, col, ddl_type in NEW_COLUMNS:
            try:
                if column_exists(insp, table, col):
                    continue
                conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {col} {ddl_type};'))
                print(f"[MIGRATION] Added column {table}.{col}")
            except Exception as e:
                print(f"[WARN] Could not add column {table}.{col}: {e}")
        # External table
        try:
            conn.execute(text(CREATE_EXTERNAL_TABLE))
            print("[MIGRATION] Ensured table external_code_links")
        except Exception as e:
            print(f"[WARN] Could not create external_code_links: {e}")
        # Seed external links if empty
        try:
            res = conn.execute(text("SELECT COUNT(*) FROM external_code_links"))
            count = res.scalar() or 0
            if count == 0:
                for system, source_type, source_code, ext_code, display in SEED_EXTERNAL:
                    conn.execute(text("INSERT INTO external_code_links(system, source_type, source_code, external_code, display) VALUES (:s,:st,:sc,:ec,:d)"),
                                 {"s": system, "st": source_type, "sc": source_code, "ec": ext_code, "d": display})
                print("[MIGRATION] Seeded external_code_links")
        except Exception as e:
            print(f"[WARN] Could not seed external_code_links: {e}")
    print("[MIGRATION] Phase 2 migration complete.")

if __name__ == "__main__":
    main()
