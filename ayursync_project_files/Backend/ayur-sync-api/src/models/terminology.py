# src/models/terminology.py

from pydantic import BaseModel, Field

class Terminology(BaseModel):
    """
    A Pydantic model to represent a single terminology entry.
    
    This acts as a data structure with automatic validation. It ensures that
    any terminology data we work with in our application has a 'code' and a 'term',
    and that they are both strings.
    """
    
    # The Field class allows us to add more information, like an example.
    # This will show up in the auto-generated API documentation.
    code: str = Field(..., example="ASU25.14", description="The unique code for the terminology term.")
    term: str = Field(..., example="Gridhrasi", description="The display name or term for the code.")

    # This is an optional configuration class that allows us to define
    # how Pydantic models should behave. In this case, we're telling it
    # to be able to create an instance from an object's attributes,
    # which is useful when working with database models later.
    class Config:
        orm_mode = True
