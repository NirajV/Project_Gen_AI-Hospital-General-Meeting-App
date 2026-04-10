"""
MongoDB Database Connection and Utilities
"""
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from .config import MONGO_URL, DB_NAME

# MongoDB Client
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


def serialize_doc(doc: dict) -> dict:
    """Remove MongoDB _id and convert dates to strings"""
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != '_id'}
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result
