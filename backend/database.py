from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import logging
from datetime import datetime
from config import settings

logger = logging.getLogger(__name__)

class Database:
    client: Optional[AsyncIOMotorClient] = None

database = Database()

async def get_database():
    return database.client[settings.DATABASE_NAME]

async def init_db():
    """Initialize database connection"""
    try:
        database.client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = database.client[settings.DATABASE_NAME]
        # Create indexes for resumes
        await db.resumes.create_index("filename")
        await db.resumes.create_index("upload_date")
        await db.resumes.create_index("is_best")
        await db.analyses.create_index("resume_id")
        await db.analyses.create_index("created_at")

        # Ensure feedback collection exists with indexes
        await db.feedback.create_index("resume_id")
        await db.feedback.create_index("created_at")

        # Ensure ontology collection exists with default document
        await db.ontology.update_one(
            {"_id": "main"},
            {
                "$setOnInsert": {
                    "skills": [],
                    "job_titles": [],
                    "industries": [],
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        # Create indexes for users collection
        await db.users.create_index("email", unique=True)
        await db.users.create_index("token")

        # Create index for analysis settings collection
        await db.analysis_settings.create_index("user_id", unique=True)
        
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise

async def get_db():
    """Get database instance"""
    return await get_database()

async def close_db():
    """Close database connection"""
    if database.client:
        database.client.close()
        logger.info("Database connection closed")

