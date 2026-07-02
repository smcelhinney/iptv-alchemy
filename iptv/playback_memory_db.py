"""
Redis-backed playback memory store.

Each VOD favourite's playback progress is stored under
    playback:memory:{hit_id}

Value is a JSON object: { id, currentTime, duration, updatedAt }
"""

import json
import logging
import os
import time

logger = logging.getLogger(__name__)

_PREFIX = "playback:memory:"
_LAST_PLAYED_KEY = "playback:last_played"
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


def save_playback(hit_id: str, current_time: float, duration: float) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        ts = int(time.time())
        data = {
            "id": hit_id,
            "currentTime": round(current_time, 1),
            "duration": round(duration, 1),
            "updatedAt": ts,
        }
        client.set(f"{_PREFIX}{hit_id}", json.dumps(data))
        client.hset(_LAST_PLAYED_KEY, hit_id, str(ts))
    except Exception as e:
        logger.warning("Failed to save playback memory: %s", e)


def delete_playback(hit_id: str) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        client.delete(f"{_PREFIX}{hit_id}")
        client.hdel(_LAST_PLAYED_KEY, hit_id)
    except Exception as e:
        logger.warning("Failed to delete playback memory: %s", e)


def get_all_playback() -> dict[str, dict]:
    client = _get_redis_client()
    if client is None:
        return {}
    try:
        keys = client.keys(f"{_PREFIX}*")
        if not keys:
            return {}
        pipe = client.pipeline()
        for k in keys:
            pipe.get(k)
        results = pipe.execute()
        out = {}
        for raw in results:
            if raw:
                entry = json.loads(raw)
                out[entry["id"]] = entry
        return out
    except Exception as e:
        logger.warning("Failed to read playback memory: %s", e)
        return {}


def get_all_last_played() -> dict[str, str]:
    client = _get_redis_client()
    if client is None:
        return {}
    try:
        result = client.hgetall(_LAST_PLAYED_KEY)
        return result or {}
    except Exception as e:
        logger.warning("Failed to read last played: %s", e)
        return {}
