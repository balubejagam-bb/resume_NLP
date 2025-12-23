from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file before anything else
load_dotenv()

class Settings(BaseSettings):
    # MongoDB Atlas Connection
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL", 
        "mongodb+srv://bejagambalu_db_user:Dhanu2003@dhanu.zzrhxc0.mongodb.net/?retryWrites=true&w=majority&appName=dhanu"
    )
    DATABASE_NAME: str = "resume_intelligence"
    
    # File Storage
    UPLOAD_DIR: str = "uploads"
    EXPORT_DIR: str = "exports"
    MAX_FILE_SIZE: int = 15 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt"]
    MAX_FILES: int = 15
    
    # Gemini AI
    GEMINI_API_KEY: str = "AIzaSyA4iQQCpsA7av7TsI83sUpwhP4zg30FlZ8"
    # Updated defaults (Dec 2025): prefer Gemini 2.5 / 3 models and v1 API
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_API_VERSION: str = "v1"
    GEMINI_TEMPERATURE: float = 0.35
    GEMINI_MAX_TOKENS: int = 8092
    
    # NLP
    SPACY_MODEL: str = "en_core_web_sm"
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

