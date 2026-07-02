"""
Redis-backed library store.

Each category (movies, series, tv_channels) is stored as a Redis SET of document IDs.
"""

import json
import logging
import os
import time

logger = logging.getLogger(__name__)

_LIBRARY_PREFIX = "library:"
_ADDED_KEY = "library:added_at"
_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380/0")

_client = None


def _get_redis_client():
    global _client
    if _client is None:
        try:
            import redis
            _client = redis.from_url(_REDIS_URL, decode_responses=True)
            _client.ping()
        except Exception as e:
            logger.warning("Redis not available: %s", e)
            return None
    return _client


def _key(type_str: str) -> str:
    return f"{_LIBRARY_PREFIX}{type_str}"


def get_library() -> dict[str, list[str]]:
    """Return all document IDs grouped by type."""
    client = _get_redis_client()
    if client is None:
        return {"movies": [], "series": [], "tv_channels": []}
    try:
        movies = list(client.smembers(_key("movies"))) if client.exists(_key("movies")) else []
        series = list(client.smembers(_key("series"))) if client.exists(_key("series")) else []
        tv = list(client.smembers(_key("tv_channels"))) if client.exists(_key("tv_channels")) else []
        return {"movies": movies, "series": series, "tv_channels": tv}
    except Exception as e:
        logger.warning("Failed to read library: %s", e)
        return {"movies": [], "series": [], "tv_channels": []}


def add_to_library(type_str: str, doc_id: str) -> bool:
    """Add a document ID to the library. Returns True if added, False if already present."""
    client = _get_redis_client()
    if client is None:
        logger.warning("Redis not available, cannot add to library")
        return False
    try:
        result = client.sadd(_key(type_str), doc_id)
        if result == 1:
            client.hset(_ADDED_KEY, doc_id, str(int(time.time())))
        return result == 1
    except Exception as e:
        logger.warning("Failed to add to library: %s", e)
        return False


def remove_from_library(type_str: str, doc_id: str) -> None:
    """Remove a document ID from the library."""
    client = _get_redis_client()
    if client is None:
        logger.warning("Redis not available, cannot remove from library")
        return
    try:
        client.srem(_key(type_str), doc_id)
        client.delete(f"playback:memory:{doc_id}")
        client.hdel(_ADDED_KEY, doc_id)
        client.hdel("playback:last_played", doc_id)
    except Exception as e:
        logger.warning("Failed to remove from library: %s", e)


def is_in_library(doc_id: str) -> bool:
    """Check if a document ID exists in any library category."""
    client = _get_redis_client()
    if client is None:
        return False
    try:
        for type_str in ("movies", "series", "tv_channels"):
            if client.sismember(_key(type_str), doc_id):
                return True
        return False
    except Exception as e:
        logger.warning("Failed to check library membership: %s", e)
        return False


def get_all_added_times() -> dict[str, str]:
    client = _get_redis_client()
    if client is None:
        return {}
    try:
        result = client.hgetall(_ADDED_KEY)
        return result or {}
    except Exception as e:
        logger.warning("Failed to read added times: %s", e)
        return {}
