import os
import uuid
from pathlib import Path
from typing import Optional
import aiofiles
import logging
from config import settings

logger = logging.getLogger(__name__)

async def save_uploaded_file(file_content: bytes, filename: str) -> str:
    """Save uploaded file and return unique file path"""
    try:
        # Generate unique filename
        file_ext = Path(filename).suffix.lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        # Ensure directory exists
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        logger.info(f"File saved: {file_path}")
        return file_path
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        raise

def get_file_path(filename: str) -> str:
    """Get full path for a file"""
    return os.path.join(settings.UPLOAD_DIR, filename)

async def delete_file(file_path: str) -> bool:
    """Delete a file"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"File deleted: {file_path}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        return False

def get_file_size(file_path: str) -> int:
    """Get file size in bytes"""
    return os.path.getsize(file_path)

