"""
OpenSubtitles API client and Redis-backed subtitle store.

Provides functions to login, search subtitles, download .srt files,
convert them to WebVTT, and store/retrieve them from Redis.
"""

import json
import logging
import os
import time

import requests as http_requests

logger = logging.getLogger(__name__)

OPENSUBTITLES_BASE = "https://api.opensubtitles.com/api/v1"
_REDIS_CLIENT = None
_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380/0")
_TOKEN_KEY = "opensubtitles:token"
_SUBTITLE_PREFIX = "subtitle:movie:"
_SUBTITLE_EPISODE_PREFIX = "subtitle:episode:"


def _get_api_key() -> str:
    from .config_db import get_config
    key = get_config("opensubtitles_api_key", os.getenv("OPEN_SUBTITLES_API_KEY", ""))
    if not key:
        logger.warning("OpenSubtitles API key not configured")
    return key


def _get_credentials() -> tuple[str, str]:
    from .config_db import get_config
    username = get_config("opensubtitles_username", os.getenv("OPEN_SUBTITLES_USERNAME", ""))
    password = get_config("opensubtitles_password", os.getenv("OPEN_SUBTITLES_PASSWORD", ""))
    if not username or not password:
        logger.warning("OpenSubtitles username or password not configured")
    return username, password


def _get_redis_client():
    global _REDIS_CLIENT
    if _REDIS_CLIENT is None:
        try:
            import redis
            _REDIS_CLIENT = redis.from_url(_REDIS_URL, decode_responses=True)
            _REDIS_CLIENT.ping()
        except Exception as e:
            logger.warning("Redis not available: %s", e)
            return None
    return _REDIS_CLIENT


def _rate_limit() -> None:
    """Sleep 1 second to respect OpenSubtitles rate limits."""
    time.sleep(1)


def _api_headers() -> dict:
    key = _get_api_key()
    return {
        "Api-Key": key,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "iptv-alchemy v1.0",
    }


def _auth_headers() -> dict:
    headers = _api_headers()
    token = _get_cached_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _get_cached_token() -> str | None:
    client = _get_redis_client()
    if client is None:
        return None
    try:
        return client.get(_TOKEN_KEY)
    except Exception as e:
        logger.warning("Failed to read token from Redis: %s", e)
        return None


def _cache_token(token: str) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        client.setex(_TOKEN_KEY, 86400, token)
    except Exception as e:
        logger.warning("Failed to cache token: %s", e)


def _clear_token() -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        client.delete(_TOKEN_KEY)
    except Exception as e:
        logger.warning("Failed to clear token: %s", e)


def _login() -> str | None:
    """Authenticate with OpenSubtitles and return bearer token."""
    username, password = _get_credentials()
    api_key = _get_api_key()
    if not username or not password or not api_key:
        logger.warning("Cannot login: missing credentials or API key")
        return None

    try:
        logger.info("OpenSubtitles login request: POST %s/login", OPENSUBTITLES_BASE)
        resp = http_requests.post(
            f"{OPENSUBTITLES_BASE}/login",
            headers=_api_headers(),
            json={"username": username, "password": password},
            timeout=15,
        )
        logger.info("OpenSubtitles login response: status=%s body=%s", resp.status_code, resp.text)
        if resp.status_code == 401:
            logger.warning("OpenSubtitles login failed: 401 unauthorized")
            return None
        resp.raise_for_status()
        data = resp.json()
        token = data.get("token")
        if token:
            _cache_token(token)
            logger.info("OpenSubtitles login succeeded, token cached")
            return token
        else:
            logger.warning("OpenSubtitles login response missing token: %s", data)
    except http_requests.RequestException as e:
        logger.warning("OpenSubtitles login failed: %s", e)
    return None


def _ensure_token() -> str | None:
    token = _get_cached_token()
    if token:
        return token
    return _login()


# ---------------------------------------------------------------------------
# TMDB helper to get IMDb ID
# ---------------------------------------------------------------------------

def _tmdb_headers() -> dict:
    from .tmdb import _tmdb_headers as tmdb_h
    return tmdb_h()


def get_imdb_id(tmdb_id: int) -> str | None:
    """Fetch IMDb ID (without tt prefix) for a TMDB movie ID."""
    try:
        resp = http_requests.get(
            f"https://api.themoviedb.org/3/movie/{tmdb_id}/external_ids",
            headers=_tmdb_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        raw = data.get("imdb_id") or ""
        # OpenSubtitles expects just the numeric ID without the 'tt' prefix
        if raw.startswith("tt"):
            return raw[2:]
        return raw or None
    except http_requests.RequestException as e:
        logger.warning("TMDB external_ids failed for %s: %s", tmdb_id, e)
        return None


def get_series_imdb_id(tmdb_id: int) -> str | None:
    """Fetch IMDb ID (without tt prefix) for a TMDB TV series ID."""
    try:
        resp = http_requests.get(
            f"https://api.themoviedb.org/3/tv/{tmdb_id}/external_ids",
            headers=_tmdb_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        raw = data.get("imdb_id") or ""
        if raw.startswith("tt"):
            return raw[2:]
        return raw or None
    except http_requests.RequestException as e:
        logger.warning("TMDB series external_ids failed for %s: %s", tmdb_id, e)
        return None


# ---------------------------------------------------------------------------
# Subtitle search
# ---------------------------------------------------------------------------

def search_subtitles(imdb_id: str, season: int | None = None, episode: int | None = None) -> list[dict]:
    """Search English subtitles by IMDb ID. Returns list of subtitle results.
    
    Uses only Api-Key — no login required for search.
    If season and episode are provided, searches for episode subtitles.
    """
    logger.info("search_subtitles called with imdb_id=%s season=%s episode=%s", imdb_id, season, episode)
    api_key = _get_api_key()
    if not api_key:
        logger.warning("search_subtitles: OpenSubtitles API key not configured")
        return []

    headers = {
        "Api-Key": api_key,
        "Accept": "application/json",
        "User-Agent": "iptv-alchemy v1.0",
    }
    try:
        url = f"{OPENSUBTITLES_BASE}/subtitles"
        params: dict[str, str | int] = {"imdb_id": imdb_id, "languages": "en"}
        if season is not None:
            params["season_number"] = season
        if episode is not None:
            params["episode_number"] = episode
        logger.info("OpenSubtitles search request: GET %s params=%s", url, params)
        resp = http_requests.get(url, headers=headers, params=params, timeout=15)
        logger.info("OpenSubtitles search response: status=%s body=%s", resp.status_code, resp.text[:500])
        resp.raise_for_status()
        data = resp.json()
        raw_items = data.get("data", [])
        logger.info("OpenSubtitles search returned %s items", len(raw_items))
        results = []
        for item in raw_items:
            attr = item.get("attributes", {})
            files = attr.get("files", [])
            file_id = files[0].get("file_id") if files else None
            if file_id:
                results.append({
                    "file_id": file_id,
                    "language": attr.get("language", "en"),
                    "release": attr.get("release", ""),
                    "hi": attr.get("hearing_impaired", False),
                    "fps": attr.get("fps", None),
                    "hd": attr.get("hd", False),
                    "download_count": attr.get("download_count", 0),
                    "votes": attr.get("votes", 0),
                })
        # Sort by download count descending
        results.sort(key=lambda r: r.get("download_count", 0), reverse=True)
        logger.info("OpenSubtitles search parsed %s results", len(results))
        return results
    except http_requests.RequestException as e:
        logger.warning("OpenSubtitles search failed: %s", e)
        return []


# ---------------------------------------------------------------------------
# Download + convert
# ---------------------------------------------------------------------------

def download_srt(file_id: int) -> str | None:
    """Download subtitle .srt content from OpenSubtitles by file_id."""
    logger.info("download_srt called with file_id=%s", file_id)
    token = _ensure_token()
    if not token:
        logger.warning("download_srt: no token available")
        return None

    _rate_limit()

    try:
        resp = http_requests.post(
            f"{OPENSUBTITLES_BASE}/download",
            headers=_auth_headers(),
            json={"file_id": file_id},
            timeout=15,
        )
        logger.info("OpenSubtitles download response: status=%s body=%s", resp.status_code, resp.text[:500])
        if resp.status_code == 401:
            _clear_token()
            token = _login()
            if token:
                resp = http_requests.post(
                    f"{OPENSUBTITLES_BASE}/download",
                    headers=_auth_headers(),
                    json={"file_id": file_id},
                    timeout=15,
                )
        resp.raise_for_status()
        data = resp.json()
        link = data.get("link")
        if not link:
            logger.warning("OpenSubtitles download returned no link: %s", data)
            return None

        # Download the actual .srt file
        _rate_limit()
        srt_resp = http_requests.get(link, timeout=30)
        logger.info("OpenSubtitles file download response: status=%s content_length=%s", srt_resp.status_code, len(srt_resp.text))
        srt_resp.raise_for_status()
        return srt_resp.text
    except http_requests.RequestException as e:
        logger.warning("OpenSubtitles download failed for file_id %s: %s", file_id, e)
        return None


def srt_to_vtt(srt_content: str) -> str:
    """Convert SRT format to WebVTT format."""
    lines = ["WEBVTT"]
    for line in srt_content.splitlines():
        # Replace comma with dot in timestamps (00:01:02,500 --> 00:01:05,000)
        if " --> " in line:
            line = line.replace(",", ".")
        lines.append(line)
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Redis-backed subtitle store
# ---------------------------------------------------------------------------

def store_subtitle(doc_id: str, file_id: int, lang: str, release: str, vtt: str) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        blob = {
            "file_id": file_id,
            "language": lang,
            "release": release,
            "vtt": vtt,
        }
        client.set(f"{_SUBTITLE_PREFIX}{doc_id}", json.dumps(blob))
    except Exception as e:
        logger.warning("Failed to store subtitle: %s", e)


def get_subtitle(doc_id: str) -> dict | None:
    client = _get_redis_client()
    if client is None:
        return None
    try:
        raw = client.get(f"{_SUBTITLE_PREFIX}{doc_id}")
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        logger.warning("Failed to read subtitle: %s", e)
        return None


def delete_subtitle(doc_id: str) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        client.delete(f"{_SUBTITLE_PREFIX}{doc_id}")
    except Exception as e:
        logger.warning("Failed to delete subtitle: %s", e)


# ---------------------------------------------------------------------------
# Episode subtitle store
# ---------------------------------------------------------------------------

def store_episode_subtitle(ep_id: str, file_id: int, lang: str, release: str, vtt: str) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        blob = {
            "file_id": file_id,
            "language": lang,
            "release": release,
            "vtt": vtt,
        }
        client.set(f"{_SUBTITLE_EPISODE_PREFIX}{ep_id}", json.dumps(blob))
    except Exception as e:
        logger.warning("Failed to store episode subtitle: %s", e)


def get_episode_subtitle(ep_id: str) -> dict | None:
    client = _get_redis_client()
    if client is None:
        return None
    try:
        raw = client.get(f"{_SUBTITLE_EPISODE_PREFIX}{ep_id}")
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        logger.warning("Failed to read episode subtitle: %s", e)
        return None


def delete_episode_subtitle(ep_id: str) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        client.delete(f"{_SUBTITLE_EPISODE_PREFIX}{ep_id}")
    except Exception as e:
        logger.warning("Failed to delete episode subtitle: %s", e)


def fetch_and_store_episode_subtitle(ep_id: str, file_id: int, release: str) -> dict | None:
    srt = download_srt(file_id)
    if srt is None:
        return None
    vtt = srt_to_vtt(srt)
    store_episode_subtitle(ep_id, file_id, "en", release, vtt)
    return get_episode_subtitle(ep_id)


# ---------------------------------------------------------------------------
# Fetch + store helper
# ---------------------------------------------------------------------------

def fetch_and_store_subtitle(doc_id: str, file_id: int, release: str) -> dict | None:
    srt = download_srt(file_id)
    if srt is None:
        return None
    vtt = srt_to_vtt(srt)
    store_subtitle(doc_id, file_id, "en", release, vtt)
    return get_subtitle(doc_id)
