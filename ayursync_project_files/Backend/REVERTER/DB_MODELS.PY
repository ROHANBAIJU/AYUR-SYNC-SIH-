# src/db/models.py

from sqlalchemy import Column, Integer, String, Index

from src.db.session import Base

# This is our SQLAlchemy model for the terminology data.
# It defines the structure of the 'terminologies' table in our database.

class Terminology(Base):
    """
    Represents a single terminology entry in the database.
    SQLAlchemy's ORM will map this class to the 'terminologies' table.
    """
    __tablename__ = "terminologies"

    # Define the columns for the table.
    id = Column(Integer, primary_key=True, index=True)
    
    # The unique code for the terminology (e.g., 'ASU01.1').
    # We add an index for faster lookups based on the code.
    # unique=True ensures we don't have duplicate codes.
    code = Column(String, unique=True, index=True, nullable=False)
    
    # The display term for the terminology (e.g., 'Vataja Kasa').
    # We add an index for faster text-based searches.
    term = Column(String, index=True, nullable=False)

# It can be useful to create a single index on both columns if you often query them together
Index('ix_terminologies_code_term', Terminology.code, Terminology.term)



DB/MODELS UPATED