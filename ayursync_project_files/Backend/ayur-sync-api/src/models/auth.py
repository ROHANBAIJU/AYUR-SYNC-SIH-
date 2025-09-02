# src/models/auth.py

from pydantic import BaseModel

class Token(BaseModel):
    """
    Pydantic model for the JWT token response.
    This is the structure that will be returned to the client upon successful authentication.
    """
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """
    Pydantic model for the data encoded within the JWT.
    It contains the username (subject) of the token.
    """
    username: str | None = None

# For the hackathon, we will use a simple in-memory user "database".
# In a real application, this would be a full User model mapping to a database table.
class User(BaseModel):
    """
    Basic user model.
    """
    username: str
    
class UserInDB(User):
    """
    User model as it would be stored in the database, including the hashed password.
    """
    hashed_password: str

