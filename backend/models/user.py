from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserPublic"

class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatar: str
    color: str
    dept: str
    theme: Optional[str] = "dark"

Token.model_rebuild()
