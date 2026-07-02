"""
TMDB API client and Redis-backed metadata store.

Provides functions to search TMDB, fetch movie/TV details/credits,
store merged metadata in Redis, and retrieve it later.
"""

import json
import logging
import os
import time

import requests as http_requests

logger = logging.getLogger(__name__)

TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"
_TMDB_TOKEN = None
_REDIS_CLIENT = None
_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6380/0")


def _get_tmdb_token() -> str:
    global _TMDB_TOKEN
    if _TMDB_TOKEN is None:
        from iptv.config_db import get_config
        _TMDB_TOKEN = get_config("tmdb_api_key", os.getenv("TMDB_API_KEY", ""))
    if not _TMDB_TOKEN:
        logger.warning("TMDB_API_KEY not set")
    return _TMDB_TOKEN


def _tmdb_headers() -> dict:
    token = _get_tmdb_token()
    return {
        "Authorization": f"Bearer {token}",
        "accept": "application/json",
    }


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
    """Sleep 1 second to respect TMDB rate limits."""
    time.sleep(1)


def build_image_url(path: str | None, size: str = "original") -> str | None:
    if not path:
        return None
    return f"{TMDB_IMAGE_BASE}/{size}{path}"


# ---------------------------------------------------------------------------
# Movie helpers
# ---------------------------------------------------------------------------

def search_movie(query: str) -> list[dict]:
    token = _get_tmdb_token()
    if not token:
        return []
    try:
        resp = http_requests.get(
            "https://api.themoviedb.org/3/search/movie",
            params={"query": query},
            headers=_tmdb_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        for r in results:
            r["_poster_url"] = build_image_url(r.get("poster_path"), "w185")
            r["_backdrop_url"] = build_image_url(r.get("backdrop_path"), "w780")
        return results
    except http_requests.RequestException as e:
        logger.warning("TMDB search_movie failed: %s", e)
        return []


def get_movie_details(tmdb_id: int) -> dict | None:
    token = _get_tmdb_token()
    if not token:
        return None
    try:
        resp = http_requests.get(
            f"https://api.themoviedb.org/3/movie/{tmdb_id}",
            params={"append_to_response": "credits"},
            headers=_tmdb_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        data["_poster_url"] = build_image_url(data.get("poster_path"), "w500")
        data["_backdrop_url"] = build_image_url(data.get("backdrop_path"), "original")
        return data
    except http_requests.RequestException as e:
        logger.warning("TMDB movie details failed for %s: %s", tmdb_id, e)
        return None


# ---------------------------------------------------------------------------
# TV Series helpers
# ---------------------------------------------------------------------------

def search_tv(query: str) -> list[dict]:
    token = _get_tmdb_token()
    if not token:
        return []
    try:
        resp = http_requests.get(
            "https://api.themoviedb.org/3/search/tv",
            params={"query": query},
            headers=_tmdb_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        for r in results:
            r["_poster_url"] = build_image_url(r.get("poster_path"), "w185")
            r["_backdrop_url"] = build_image_url(r.get("backdrop_path"), "w780")
        return results
    except http_requests.RequestException as e:
        logger.warning("TMDB search_tv failed: %s", e)
        return []


def get_tv_details(tmdb_id: int) -> dict | None:
    token = _get_tmdb_token()
    if not token:
        return None
    try:
        resp = http_requests.get(
            f"https://api.themoviedb.org/3/tv/{tmdb_id}",
            params={"append_to_response": "credits"},
            headers=_tmdb_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        data["_poster_url"] = build_image_url(data.get("poster_path"), "w500")
        data["_backdrop_url"] = build_image_url(data.get("backdrop_path"), "original")
        return data
    except http_requests.RequestException as e:
        logger.warning("TMDB tv details failed for %s: %s", tmdb_id, e)
        return None


def get_tv_season(tmdb_id: int, season_number: int) -> dict | None:
    token = _get_tmdb_token()
    if not token:
        return None
    try:
        resp = http_requests.get(
            f"https://api.themoviedb.org/3/tv/{tmdb_id}/season/{season_number}",
            headers=_tmdb_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        # Attach still image URLs to episodes
        for ep in data.get("episodes", []):
            ep["_still_url"] = build_image_url(ep.get("still_path"), "w300")
        return data
    except http_requests.RequestException as e:
        logger.warning("TMDB tv season failed for %s season %s: %s", tmdb_id, season_number, e)
        return None


# ---------------------------------------------------------------------------
# Redis-backed metadata store
# ---------------------------------------------------------------------------

_MOVIE_PREFIX = "tmdb:movie:"
_SERIES_PREFIX = "tmdb:series:"


def store_movie_metadata(doc_id: str, data: dict) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        client.set(f"{_MOVIE_PREFIX}{doc_id}", json.dumps(data))
    except Exception as e:
        logger.warning("Failed to store movie metadata: %s", e)


def get_movie_metadata(doc_id: str) -> dict | None:
    client = _get_redis_client()
    if client is None:
        return None
    try:
        raw = client.get(f"{_MOVIE_PREFIX}{doc_id}")
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        logger.warning("Failed to read movie metadata: %s", e)
        return None


def delete_movie_metadata(doc_id: str) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        client.delete(f"{_MOVIE_PREFIX}{doc_id}")
    except Exception as e:
        logger.warning("Failed to delete movie metadata: %s", e)


def store_series_metadata(doc_id: str, data: dict) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        client.set(f"{_SERIES_PREFIX}{doc_id}", json.dumps(data))
    except Exception as e:
        logger.warning("Failed to store series metadata: %s", e)


def get_series_metadata(doc_id: str) -> dict | None:
    client = _get_redis_client()
    if client is None:
        return None
    try:
        raw = client.get(f"{_SERIES_PREFIX}{doc_id}")
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        logger.warning("Failed to read series metadata: %s", e)
        return None


def delete_series_metadata(doc_id: str) -> None:
    client = _get_redis_client()
    if client is None:
        return
    try:
        client.delete(f"{_SERIES_PREFIX}{doc_id}")
    except Exception as e:
        logger.warning("Failed to delete series metadata: %s", e)


# ---------------------------------------------------------------------------
# Fetch + store helpers
# ---------------------------------------------------------------------------

def fetch_and_store_movie(doc_id: str, tmdb_id: int) -> dict | None:
    details = get_movie_details(tmdb_id)
    if details is None:
        return None

    credits = details.pop("credits", {})
    cast = [
        {
            "id": c["id"],
            "name": c["name"],
            "character": c.get("character", ""),
            "profile_path": c.get("profile_path"),
            "profile_url": build_image_url(c.get("profile_path"), "w185"),
            "order": c.get("order", 0),
        }
        for c in credits.get("cast", [])
    ]
    crew = [
        {
            "id": c["id"],
            "name": c["name"],
            "job": c.get("job", ""),
            "department": c.get("department", ""),
            "profile_path": c.get("profile_path"),
            "profile_url": build_image_url(c.get("profile_path"), "w185"),
        }
        for c in credits.get("crew", [])
    ]
    director = next(
        (c["name"] for c in credits.get("crew", []) if c.get("job") == "Director"),
        None,
    )

    blob = {
        "tmdb_id": tmdb_id,
        "title": details.get("title"),
        "original_title": details.get("original_title"),
        "overview": details.get("overview"),
        "tagline": details.get("tagline"),
        "release_date": details.get("release_date"),
        "runtime": details.get("runtime"),
        "vote_average": details.get("vote_average"),
        "vote_count": details.get("vote_count"),
        "genres": [g["name"] for g in details.get("genres", [])],
        "production_companies": [
            {"name": c["name"], "logo_path": c.get("logo_path")}
            for c in details.get("production_companies", [])
        ],
        "production_countries": [c["name"] for c in details.get("production_countries", [])],
        "spoken_languages": [c["english_name"] for c in details.get("spoken_languages", [])],
        "poster_url": details.get("_poster_url"),
        "backdrop_url": details.get("_backdrop_url"),
        "director": director,
        "cast": cast,
        "crew": crew,
    }

    store_movie_metadata(doc_id, blob)
    return blob


def fetch_and_store_series(doc_id: str, tmdb_id: int) -> dict | None:
    """
    Fetch TV series details + all seasons with episodes from TMDB,
    merge into a single blob, store in Redis, and return the blob.
    """
    details = get_tv_details(tmdb_id)
    if details is None:
        return None

    # Rate limit between TV details and first season fetch
    _rate_limit()

    # Fetch all seasons
    seasons_data = []
    for season_info in details.get("seasons", []):
        season_num = season_info.get("season_number")
        if season_num is None:
            continue
        season = get_tv_season(tmdb_id, season_num)
        if season is not None:
            seasons_data.append(season)
        # Rate limit between season fetches
        _rate_limit()

    # Extract credits
    credits = details.pop("credits", {})
    cast = [
        {
            "id": c["id"],
            "name": c["name"],
            "character": c.get("character", ""),
            "profile_path": c.get("profile_path"),
            "profile_url": build_image_url(c.get("profile_path"), "w185"),
            "order": c.get("order", 0),
        }
        for c in credits.get("cast", [])
    ]
    crew = [
        {
            "id": c["id"],
            "name": c["name"],
            "job": c.get("job", ""),
            "department": c.get("department", ""),
            "profile_path": c.get("profile_path"),
            "profile_url": build_image_url(c.get("profile_path"), "w185"),
        }
        for c in credits.get("crew", [])
    ]
    creator = next(
        (c["name"] for c in details.get("created_by", [])),
        None,
    )

    # Build season list
    seasons = []
    for season in seasons_data:
        episodes = []
        for ep in season.get("episodes", []):
            episodes.append({
                "id": ep.get("id"),
                "name": ep.get("name"),
                "overview": ep.get("overview"),
                "air_date": ep.get("air_date"),
                "runtime": ep.get("runtime"),
                "season_number": ep.get("season_number"),
                "episode_number": ep.get("episode_number"),
                "still_url": ep.get("_still_url"),
            })
        seasons.append({
            "season_number": season.get("season_number"),
            "name": season.get("name"),
            "episode_count": len(episodes),
            "overview": season.get("overview"),
            "poster_url": build_image_url(season.get("poster_path"), "w300"),
            "episodes": episodes,
        })

    blob = {
        "tmdb_id": tmdb_id,
        "title": details.get("name"),
        "original_name": details.get("original_name"),
        "overview": details.get("overview"),
        "tagline": details.get("tagline"),
        "first_air_date": details.get("first_air_date"),
        "last_air_date": details.get("last_air_date"),
        "number_of_seasons": details.get("number_of_seasons"),
        "number_of_episodes": details.get("number_of_episodes"),
        "vote_average": details.get("vote_average"),
        "vote_count": details.get("vote_count"),
        "genres": [g["name"] for g in details.get("genres", [])],
        "production_companies": [
            {"name": c["name"], "logo_path": c.get("logo_path")}
            for c in details.get("production_companies", [])
        ],
        "poster_url": details.get("_poster_url"),
        "backdrop_url": details.get("_backdrop_url"),
        "creator": creator,
        "cast": cast,
        "crew": crew,
        "seasons": seasons,
    }

    store_series_metadata(doc_id, blob)
    return blob
