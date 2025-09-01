# src/api/dependencies.py

from src.db.session import SessionLocal

def get_db():
    """
    FastAPI dependency that provides a database session for a single request.
    
    This function creates a new SQLAlchemy SessionLocal that will be used for a 
    single API request, and then closes it once the request is finished.
    This ensures that each request has its own isolated database session.
    """
    db = SessionLocal()
    try:
        # 'yield' passes the session object to the endpoint function.
        yield db
    finally:
        # This code runs after the endpoint has finished.
        db.close()
