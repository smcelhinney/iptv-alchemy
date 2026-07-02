"""
Thin Redis wrapper for category caching.

Categories extracted from M3U data are cached in Redis with a 24h TTL.
The cache is refreshed every time the M3U is parsed.
"""

import json
import os
import logging
from typing import List, Dict

from .utils import categorize_channels_by_url

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380/0")

_client = None


def _get_client():
    global _client
    if _client is None:
        try:
            import redis
            _client = redis.from_url(REDIS_URL, decode_responses=True)
            _client.ping()
            logger.info("Connected to Redis at %s", REDIS_URL)
        except Exception as e:
            logger.warning("Redis not available: %s", e)
            return None
    return _client


def get_redis_client():
    """Get the Redis client instance. Returns None if Redis is not available."""
    return _get_client()


def get_cached_categories(content_type: str) -> List[str]:
    """Read cached categories from Redis. Returns empty list on miss or error."""
    client = _get_client()
    if client is None:
        return []
    try:
        data = client.get(f"categories:{content_type}")
        return json.loads(data) if data else []
    except Exception as e:
        logger.warning("Failed to read categories from Redis: %s", e)
        return []


def set_cached_categories(content_type: str, categories: List[str], ttl: int = 86400) -> None:
    """Write categories to Redis with a 24h TTL."""
    client = _get_client()
    if client is None:
        return
    try:
        client.setex(f"categories:{content_type}", ttl, json.dumps(sorted(categories)))
    except Exception as e:
        logger.warning("Failed to write categories to Redis: %s", e)


def refresh_category_cache(all_channels: List[Dict]) -> None:
    """Extract unique categories per content type and write to Redis."""
    categorized = categorize_channels_by_url(all_channels)

    for content_type, channels in [
        ("movies", categorized.get("movies", [])),
        ("series", categorized.get("series", [])),
        ("tv_listings", categorized.get("live_tv", [])),
    ]:
        categories = sorted({ch.get("category", "") for ch in channels if ch.get("category")})
        set_cached_categories(content_type, categories)
        logger.info("Cached %d categories for %s", len(categories), content_type)
