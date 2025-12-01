"""Utility script to ensure all MongoDB collections exist with required indexes."""
import asyncio
import logging
from typing import Dict, List, Any

from motor.motor_asyncio import AsyncIOMotorClient

from config import settings

logger = logging.getLogger(__name__)

CollectionSpec = Dict[str, Any]

COLLECTIONS: Dict[str, CollectionSpec] = {
    "users": {
        "indexes": [
            {"keys": [("email", 1)], "unique": True},
            {"keys": [("token", 1)], "unique": False},
        ],
    },
    "resumes": {
        "indexes": [
            {"keys": [("filename", 1)], "unique": False},
            {"keys": [("upload_date", 1)], "unique": False},
            {"keys": [("is_best", 1)], "unique": False},
        ],
    },
    "analyses": {
        "indexes": [
            {"keys": [("resume_id", 1)], "unique": False},
            {"keys": [("created_at", -1)], "unique": False},
            {"keys": [("is_best", 1)], "unique": False},
        ],
    },
    "feedback": {
        "indexes": [
            {"keys": [("resume_id", 1)], "unique": False},
            {"keys": [("created_at", -1)], "unique": False},
        ],
    },
    "ontology": {
        "indexes": [
            {"keys": [("_id", 1)], "unique": True},
        ],
        "default_document": {
            "_id": "main",
            "skills": [],
            "job_titles": [],
            "industries": [],
            "updated_at": None,
        },
    },
    "analysis_settings": {
        "indexes": [
            {"keys": [("user_id", 1)], "unique": True},
        ],
    },
}


async def ensure_collection(db, name: str, spec: CollectionSpec) -> None:
    existing_collections = await db.list_collection_names()

    if name not in existing_collections:
        logger.info("Creating collection '%s'", name)
        await db.create_collection(name)

    # Create indexes
    for index in spec.get("indexes", []):
        keys = index["keys"]
        kwargs = {k: v for k, v in index.items() if k != "keys"}

        # Skip explicit unique flag for _id indexes (Mongo enforces this automatically)
        if len(keys) == 1 and keys[0][0] == "_id" and "unique" in kwargs:
            kwargs.pop("unique")

        logger.info("Ensuring index on '%s': %s %s", name, keys, f"with opts {kwargs}" if kwargs else "")
        await db[name].create_index(keys, **kwargs)

    # Insert default document if specified and missing
    default_doc = spec.get("default_document")
    if default_doc:
        existing = await db[name].find_one({"_id": default_doc["_id"]})
        if existing is None:
            logger.info("Seeding default document in '%s'", name)
            await db[name].insert_one(default_doc)


async def main() -> None:
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    try:
        tasks: List[asyncio.Task] = []
        for name, spec in COLLECTIONS.items():
            tasks.append(asyncio.create_task(ensure_collection(db, name, spec)))
        await asyncio.gather(*tasks)
        logger.info("All collections ensured successfully")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
