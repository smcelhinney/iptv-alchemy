"""
Redis-backed user settings store.

Separate namespace from config (``settings:`` vs ``config:`` prefix).
Config = server-wide operational parameters (set by admin).
Settings = per-user/viewer preferences (subtitle size, etc.).
"""

import json
import logging
import os

logger = logging.getLogger(__name__)

_SETTINGS_PREFIX = "settings:"
_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380/0")

_DEFAULTS: dict[str, str] = {
    "subtitle_enabled": "true",
    "subtitle_size": "normal",
    "transcode_enabled": "true",
}

_client = None


def _get_redis_client():
    global _client
    if _client is None:
        try:
            import redis
            _client = redis.from_url(_REDIS_URL, decode_responses=True)
            _client.ping()
        except Exception as e:
            logger.warning("Redis not available for settings: %s", e)
            return None
    return _client


def _reset_client() -> None:
    global _client
    _client = None


def _redis_key(key: str) -> str:
    return f"{_SETTINGS_PREFIX}{key}"


def get_settings() -> dict[str, str]:
    """Return all user settings. Missing keys fall back to _DEFAULTS."""
    client = _get_redis_client()
    if client is None:
        return dict(_DEFAULTS)

    try:
        result: dict[str, str] = {}
        for key in client.scan_iter(match=f"{_SETTINGS_PREFIX}*"):
            setting_key = key[len(_SETTINGS_PREFIX):]
            value = client.get(key)
            if value is not None:
                result[setting_key] = value
        return result
    except Exception as e:
        logger.warning("Failed to read settings: %s", e)
        return dict(_DEFAULTS)


def set_settings(updates: dict[str, str]) -> None:
    """Write multiple user settings."""
    client = _get_redis_client()
    if client is None:
        logger.warning("Redis not available, cannot update settings")
        return

    try:
        redis_updates = {_redis_key(k): v for k, v in updates.items()}
        if redis_updates:
            client.mset(redis_updates)
            logger.debug("Updated %d settings keys", len(redis_updates))
    except Exception as e:
        logger.warning("Failed to update settings: %s", e)
