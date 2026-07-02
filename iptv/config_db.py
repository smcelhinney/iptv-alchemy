"""
Redis-backed configuration store.

All configuration lives in Redis. On API startup ``seed_defaults()`` is called
to populate sensible defaults (and seed from ``.env`` when present) if the store
is empty. This module is self-contained to avoid circular imports with
redis_client.py (which imports utils.py, which imports config_db.py).
"""

import json
import logging
import os
import time

_mask_value = "********"
_SENSITIVE_KEYS = {
    "xtream_password",
    "emby_api_key",
    "jellyfin_api_key",
    "opensubtitles_api_key",
    "opensubtitles_password",
    "tmdb_api_key",
}

logger = logging.getLogger(__name__)

# Config key prefix - separates config from other Redis data
_CONFIG_PREFIX = "config:"
_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380/0")

# Hardcoded defaults that were previously read from config.yaml
_DEFAULTS: dict[str, str] = {
    "should_overwrite_output": "1",
    "epg_guide_prev_days": "0",
    "epg_guide_next_days": "1",
    "livetv_categories": "",
    "exclude_categories": "",
}

_client = None


def _get_redis_client():
    """Get the Redis client instance. Returns None if Redis is not available."""
    global _client
    if _client is None:
        try:
            import redis
            _client = redis.from_url(_REDIS_URL, decode_responses=True)
            _client.ping()
            logger.info("Connected to Redis at %s", _REDIS_URL)
        except Exception as e:
            logger.warning("Redis not available: %s", e)
            return None
    return _client


def _reset_client() -> None:
    """Drop the cached client so the next access reconnects."""
    global _client
    _client = None


def _redis_key(key: str) -> str:
    """Convert a config key to its Redis key representation."""
    return f"{_CONFIG_PREFIX}{key}"


def _selected_categories_key(content_type: str) -> str:
    """Convert a config type to its selected categories Redis key."""
    return f"{_CONFIG_PREFIX}selected_categories:{content_type}"


# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------

def seed_defaults(max_retries: int = 30, retry_interval: float = 1.0) -> bool:
    """Populate missing config keys with defaults and env-provided values.

    Waits for Redis to become available (useful in Docker where the API may
    start before Redis is ready to accept connections). Each key is written
    with SETNX so values already in the store are never overwritten — only
    keys that don't yet exist get seeded.

    Env vars are read from ``os.environ`` (populated by Docker's ``env_file``
    in containers, or by ``load_dotenv()`` in local dev).

    Returns True if Redis was reachable.
    """
    client = _get_redis_client()

    # Retry until Redis is reachable
    for attempt in range(max_retries):
        if client is not None:
            break
        time.sleep(retry_interval)
        _reset_client()
        client = _get_redis_client()

    if client is None:
        logger.error("Redis unavailable after %d attempts, skipping config seed", max_retries)
        return False

    # Build the full seed dict: hardcoded defaults first
    seed: dict[str, str] = dict(_DEFAULTS)

    # Overlay env vars (Docker env_file or local load_dotenv both put
    # these into os.environ)
    _ENV_MAP: dict[str, str] = {
        "xtream_server_url": "XTREAM_SERVER_URL",
        "xtream_username": "XTREAM_USERNAME",
        "xtream_password": "XTREAM_PASSWORD",
        "emby_server_url": "EMBY_SERVER",
        "emby_api_key": "EMBY_API_KEY",
        "jellyfin_server_url": "JELLYFIN_SERVER",
        "jellyfin_api_key": "JELLYFIN_API_KEY",
        "opensubtitles_api_key": "OPEN_SUBTITLES_API_KEY",
        "opensubtitles_username": "OPEN_SUBTITLES_USERNAME",
        "opensubtitles_password": "OPEN_SUBTITLES_PASSWORD",
        "tmdb_api_key": "TMDB_API_KEY",
    }
    for config_key, env_key in _ENV_MAP.items():
        seed[config_key] = os.getenv(env_key, "")

    # Output directories and onboarding flag
    seed["output_directory"] = "./output"
    seed["tv_output_directory"] = "./output/media/tv"
    seed["movies_output_directory"] = "./output/media/movies"
    seed["has_onboarded"] = ""

    # Write each key only if it doesn't already exist (SETNX)
    added = 0
    for key, value in seed.items():
        if client.setnx(_redis_key(key), value):
            added += 1

    if added:
        logger.info("Seeded %d new config keys (%d already present)", added, len(seed) - added)
    else:
        logger.debug("Config store fully populated (%d keys already present)", len(seed))

    return True


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_config(key: str, default: str = "") -> str:
    """Return a single config value, or *default* when missing."""
    client = _get_redis_client()
    if client is None:
        logger.warning("Redis not available, returning default for key: %s", key)
        return default
    try:
        value = client.get(_redis_key(key))
        return value if value is not None else default
    except Exception as e:
        logger.warning("Failed to read config key '%s': %s", key, e)
        return default


def get_all_config(mask_secrets: bool = True) -> dict[str, str]:
    """Return all config as a dict. Sensitive values are masked."""
    client = _get_redis_client()
    if client is None:
        logger.warning("Redis not available, returning empty config")
        return {}

    try:
        result: dict[str, str] = {}
        for key in client.scan_iter(match=f"{_CONFIG_PREFIX}*"):
            # Remove the config: prefix
            config_key = key[len(_CONFIG_PREFIX):]
            # Skip selected_categories keys (not part of the config dict)
            if config_key.startswith("selected_categories:"):
                continue
            value = client.get(key)
            if value is not None:
                if mask_secrets and config_key in _SENSITIVE_KEYS and value:
                    result[config_key] = _mask_value
                else:
                    result[config_key] = value
        return result
    except Exception as e:
        logger.warning("Failed to read all config: %s", e)
        return {}


def set_config(updates: dict[str, str]) -> None:
    """Write multiple config values. Skips the mask string so passwords aren't blanked."""
    client = _get_redis_client()
    if client is None:
        logger.warning("Redis not available, cannot update config")
        return

    try:
        # Build a dict of Redis key -> value for MSET
        redis_updates = {}
        for key, value in updates.items():
            if value == _mask_value:
                continue
            redis_updates[_redis_key(key)] = value

        if redis_updates:
            client.mset(redis_updates)
            logger.debug("Updated %d config keys", len(redis_updates))
    except Exception as e:
        logger.warning("Failed to update config: %s", e)


# ---------------------------------------------------------------------------
# Selected categories
# ---------------------------------------------------------------------------

def get_selected_categories(content_type: str) -> list[str]:
    """Return selected categories for a content type."""
    client = _get_redis_client()
    if client is None:
        logger.warning("Redis not available, returning empty categories for %s", content_type)
        return []

    try:
        key = _selected_categories_key(content_type)
        data = client.get(key)
        if data:
            return json.loads(data)
        return []
    except Exception as e:
        logger.warning("Failed to read selected categories for '%s': %s", content_type, e)
        return []


def set_selected_categories(content_type: str, categories: list[str]) -> None:
    """Replace all selections for a content type."""
    client = _get_redis_client()
    if client is None:
        logger.warning("Redis not available, cannot save categories for %s", content_type)
        return

    try:
        key = _selected_categories_key(content_type)
        if categories:
            client.set(key, json.dumps(categories))
        else:
            client.delete(key)
        logger.debug("Saved %d categories for %s", len(categories), content_type)
    except Exception as e:
        logger.warning("Failed to save selected categories for '%s': %s", content_type, e)
