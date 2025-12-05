from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from models import UserRole

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=100)
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    role: UserRole = UserRole.OPERATOR
    is_approver: bool = False

    class Config:
        use_enum_values = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    email: Optional[str] = Field(None, max_length=100)
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    role: Optional[UserRole] = None
    is_approver: Optional[bool] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        use_enum_values = True

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: 'User'

class TokenData(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None

class PasswordReset(BaseModel):
    username: str
    old_password: str
    new_password: str = Field(..., min_length=10)