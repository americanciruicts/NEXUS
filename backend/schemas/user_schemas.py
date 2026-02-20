from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from models import UserRole
import re

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=100)
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    role: UserRole = UserRole.OPERATOR
    is_approver: bool = False
    is_itar: bool = False

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Basic email validation that allows internal domains like .local"""
        # Allow standard email format including .local domains for internal use
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+$', str(v)):
            raise ValueError('Invalid email format')
        return v

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
    is_itar: Optional[bool] = None
    is_active: Optional[bool] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """Basic email validation that allows internal domains"""
        if v and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+$', str(v)):
            raise ValueError('Invalid email format')
        return v

class User(UserBase):
    id: int
    is_active: bool
    is_itar: bool = False
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