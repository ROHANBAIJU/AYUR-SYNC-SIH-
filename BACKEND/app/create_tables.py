# File: create_tables.py
from app.db.session import engine
from app.db.models import Base
import os
from dotenv import load_dotenv
from sqlalchemy import text

def main():
    print("Connecting to the database to create tables...")
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env file.")
        return

    print("Target Database tables are being created...")

    # This command creates all the tables defined in your models file
    Base.metadata.create_all(bind=engine)

    print("Tables created successfully!")

    # Lightweight, idempotent migrations for new columns
    with engine.connect() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE traditional_terms ADD COLUMN IF NOT EXISTS source_short_definition TEXT"
            ))
            conn.execute(text(
                "ALTER TABLE traditional_terms ADD COLUMN IF NOT EXISTS source_long_definition TEXT"
            ))
            # Indexes for diagnosis_events to support analytics map queries
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_diagnosis_events_created_at ON diagnosis_events (created_at)"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_diagnosis_events_geo ON diagnosis_events (latitude, longitude)"
            ))
            conn.commit()
            print("Ensured new columns on traditional_terms (source_short_definition, source_long_definition).")
            print("Ensured indexes on diagnosis_events (created_at, latitude/longitude).")
        except Exception as e:
            print(f"Warning: Could not apply column migrations: {e}")

    print("You can now run 'scripts/discover_ai_mappings.py' to populate them.")

if __name__ == "__main__":
    main()