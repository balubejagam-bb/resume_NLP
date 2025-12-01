"""
Authentication module for user registration and login
"""
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
import logging
import re
from pydantic import BaseModel, field_validator
from database import get_database

logger = logging.getLogger(__name__)

# Email validation regex
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

def validate_email_format(email: str) -> str:
    """Validate email format"""
    if not EMAIL_REGEX.match(email):
        raise ValueError('Invalid email format')
    return email.lower()

# Pydantic models
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        return validate_email_format(v)

class UserLogin(BaseModel):
    email: str
    password: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        return validate_email_format(v)

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None
    token: Optional[str] = None

def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt"""
    salt = "resume_intelligence_salt_2024"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def generate_token() -> str:
    """Generate a secure session token"""
    return secrets.token_urlsafe(32)

async def register_user(user_data: UserRegister) -> AuthResponse:
    """Register a new user"""
    try:
        db = await get_database()
        users_collection = db.users
        
        # Check if email already exists
        existing_user = await users_collection.find_one({"email": user_data.email.lower()})
        if existing_user:
            return AuthResponse(
                success=False,
                message="Email already registered. Please login instead."
            )
        
        # Create new user
        hashed_password = hash_password(user_data.password)
        token = generate_token()
        
        new_user = {
            "name": user_data.name,
            "email": user_data.email.lower(),
            "password": hashed_password,
            "token": token,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = await users_collection.insert_one(new_user)
        
        logger.info(f"New user registered: {user_data.email}")
        
        return AuthResponse(
            success=True,
            message="Account created successfully!",
            user=UserResponse(
                id=str(result.inserted_id),
                name=user_data.name,
                email=user_data.email.lower(),
                created_at=new_user["created_at"]
            ),
            token=token
        )
        
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        return AuthResponse(
            success=False,
            message=f"Registration failed: {str(e)}"
        )

async def login_user(user_data: UserLogin) -> AuthResponse:
    """Login an existing user"""
    try:
        db = await get_database()
        users_collection = db.users
        
        # Find user by email
        user = await users_collection.find_one({"email": user_data.email.lower()})
        
        if not user:
            return AuthResponse(
                success=False,
                message="No account found with this email. Please register first."
            )
        
        # Verify password
        hashed_password = hash_password(user_data.password)
        if user["password"] != hashed_password:
            return AuthResponse(
                success=False,
                message="Invalid password. Please try again."
            )
        
        # Generate new token
        token = generate_token()
        
        # Update user's token
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"token": token, "updated_at": datetime.utcnow().isoformat()}}
        )
        
        logger.info(f"User logged in: {user_data.email}")
        
        return AuthResponse(
            success=True,
            message="Login successful!",
            user=UserResponse(
                id=str(user["_id"]),
                name=user["name"],
                email=user["email"],
                created_at=user["created_at"]
            ),
            token=token
        )
        
    except Exception as e:
        logger.error(f"Error logging in user: {e}")
        return AuthResponse(
            success=False,
            message=f"Login failed: {str(e)}"
        )

async def verify_token(token: str) -> Optional[UserResponse]:
    """Verify a session token and return user if valid"""
    try:
        db = await get_database()
        users_collection = db.users
        
        user = await users_collection.find_one({"token": token})
        
        if user:
            return UserResponse(
                id=str(user["_id"]),
                name=user["name"],
                email=user["email"],
                created_at=user["created_at"]
            )
        
        return None
        
    except Exception as e:
        logger.error(f"Error verifying token: {e}")
        return None

async def logout_user(token: str) -> bool:
    """Logout user by invalidating token"""
    try:
        db = await get_database()
        users_collection = db.users
        
        result = await users_collection.update_one(
            {"token": token},
            {"$set": {"token": None}}
        )
        
        return result.modified_count > 0
        
    except Exception as e:
        logger.error(f"Error logging out user: {e}")
        return False
