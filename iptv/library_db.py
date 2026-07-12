"""
Redis-backed library store.

Each category (movies, series, tv_channels) is stored as a Redis SET of document IDs.
"""

import json
import logging
import os
import time
import uuid

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

        for col_id in get_doc_collections(doc_id):
            remove_from_collection(col_id, doc_id)
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


# ---------------------------------------------------------------------------
# Collections
# ---------------------------------------------------------------------------

_COLLECTIONS_KEY = "library:collections"          # HASH: col_id -> JSON {name, type}
_COLLECTION_PREFIX = "library:collection:"         # SET: doc IDs


def _col_key(col_id: str) -> str:
    return f"{_COLLECTION_PREFIX}{col_id}"


def _parse_collection(col_id: str, raw: str) -> dict:
    """Parse a collection hash value. Legacy plain names default to 'movies'."""
    if raw.startswith("{"):
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
        return {
            "id": col_id,
            "name": data.get("name", raw),
            "type": data.get("type", "movies"),
        }
    return {"id": col_id, "name": raw, "type": "movies"}


def get_collections(type: str | None = None) -> list[dict]:
    """Return collections with item counts, optionally filtered by type."""
    client = _get_redis_client()
    if client is None:
        return []
    try:
        raw = client.hgetall(_COLLECTIONS_KEY)
        result = []
        for col_id, value in raw.items():
            col = _parse_collection(col_id, value)
            if type and col.get("type") != type:
                continue
            col["count"] = client.scard(_col_key(col_id))
            result.append(col)
        result.sort(key=lambda c: c["name"].lower())
        return result
    except Exception as e:
        logger.warning("Failed to read collections: %s", e)
        return []


def get_collection(col_id: str) -> dict | None:
    """Return a single collection with id, name, and type."""
    client = _get_redis_client()
    if client is None:
        return None
    try:
        raw = client.hget(_COLLECTIONS_KEY, col_id)
        if not raw:
            return None
        return _parse_collection(col_id, raw)
    except Exception as e:
        logger.warning("Failed to read collection: %s", e)
        return None


def create_collection(name: str, type: str = "movies") -> dict | None:
    """Create a new collection. Returns {id, name, type} or None on failure."""
    client = _get_redis_client()
    if client is None:
        return None
    try:
        col_id = uuid.uuid4().hex[:8]
        value = json.dumps({"name": name, "type": type})
        client.hset(_COLLECTIONS_KEY, col_id, value)
        return {"id": col_id, "name": name, "type": type}
    except Exception as e:
        logger.warning("Failed to create collection: %s", e)
        return None


def delete_collection(col_id: str) -> bool:
    """Delete a collection and its items."""
    client = _get_redis_client()
    if client is None:
        return False
    try:
        client.hdel(_COLLECTIONS_KEY, col_id)
        client.delete(_col_key(col_id))
        return True
    except Exception as e:
        logger.warning("Failed to delete collection: %s", e)
        return False


def rename_collection(col_id: str, name: str) -> bool:
    """Rename a collection while preserving its type."""
    client = _get_redis_client()
    if client is None:
        return False
    try:
        col = get_collection(col_id)
        if col is None:
            return False
        value = json.dumps({"name": name, "type": col.get("type", "movies")})
        client.hset(_COLLECTIONS_KEY, col_id, value)
        return True
    except Exception as e:
        logger.warning("Failed to rename collection: %s", e)
        return False


def add_to_collection(col_id: str, doc_id: str) -> bool:
    """Add a document ID to a collection."""
    client = _get_redis_client()
    if client is None:
        return False
    try:
        if not client.hexists(_COLLECTIONS_KEY, col_id):
            return False
        client.sadd(_col_key(col_id), doc_id)
        return True
    except Exception as e:
        logger.warning("Failed to add to collection: %s", e)
        return False


def remove_from_collection(col_id: str, doc_id: str) -> bool:
    """Remove a document ID from a collection."""
    client = _get_redis_client()
    if client is None:
        return False
    try:
        client.srem(_col_key(col_id), doc_id)
        return True
    except Exception as e:
        logger.warning("Failed to remove from collection: %s", e)
        return False


def get_collection_items(col_id: str) -> list[str]:
    """Return all document IDs in a collection."""
    client = _get_redis_client()
    if client is None:
        return []
    try:
        return list(client.smembers(_col_key(col_id)))
    except Exception as e:
        logger.warning("Failed to read collection items: %s", e)
        return []


def get_doc_collections(doc_id: str) -> list[str]:
    """Return IDs of collections that contain a given document."""
    client = _get_redis_client()
    if client is None:
        return []
    try:
        raw = client.hgetall(_COLLECTIONS_KEY)
        result = []
        for col_id in raw:
            if client.sismember(_col_key(col_id), doc_id):
                result.append(col_id)
        return result
    except Exception as e:
        logger.warning("Failed to check doc collections: %s", e)
        return []
