# File: create_tables.py
from app.db.session import engine
from app.db.models import Base
import os
from dotenv import load_dotenv

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
    print("You can now run 'scripts/discover_ai_mappings.py' to populate them.")

if __name__ == "__main__":
    main()