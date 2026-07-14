#!/usr/bin/env python3
"""FastMCP server exposing IPTV search/library/collection tools.

Runs an HTTP/SSE MCP server on port 8000. All requests must include:
    Authorization: Bearer <MCP_API_KEY>
unless MCP_API_KEY is empty (auth is then skipped for local testing).

The server proxies tool calls to the existing Flask API at iptv-api:5555
using Docker's internal network.
"""

import logging
import os
import re
from typing import Any

import requests
import uvicorn
from fastmcp import FastMCP
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import PlainTextResponse

API_BASE_URL = os.environ.get("API_BASE_URL", "http://iptv-api:5555")
IPTV_MCP_API_KEY = os.environ.get("IPTV_MCP_API_KEY", "")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("iptv-mcp")

mcp = FastMCP("iptv-alchemy")


def _normalize_library_type(content_type: str) -> str:
    """Map common content-type names to the library storage keys used by the API."""
    mapping = {
        "movie": "movies",
        "movies": "movies",
        "series": "series",
        "tv": "tv_channels",
        "tv_channels": "tv_channels",
        "live_tv": "tv_channels",
    }
    return mapping.get(content_type.lower(), content_type)


@mcp.tool()
def search_indexes(query: str) -> dict[str, Any]:
    """Search across all IPTV content indexes (movies, series, TV listings).

    Args:
        query: Free-text search query.

    Returns:
        Meilisearch multi-search response with matching documents.
    """
    url = f"{API_BASE_URL}/api/search/multi-search"
    payload = {
        "queries": [
            {
                "indexUid": "iptv_content",
                "q": query,
                "limit": 20,
            }
        ]
    }
    logger.info("search_indexes: query=%s", query)
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def add_to_library(content_type: str, doc_id: str) -> dict[str, Any]:
    """Add a movie, series, or TV channel to the user's library.

    Args:
        content_type: Type of content, e.g. 'movie', 'series', 'tv'.
        doc_id: Document ID from the search index.

    Returns:
        API response with status and added timestamp.
    """
    url = f"{API_BASE_URL}/api/library/add"
    storage_type = _normalize_library_type(content_type)
    payload = {"type": storage_type, "id": doc_id}
    logger.info("add_to_library: type=%s (normalized=%s) id=%s", content_type, storage_type, doc_id)
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def add_to_collection(collection_id: str, doc_id: str) -> dict[str, Any]:
    """Add a document to a collection.

    Args:
        collection_id: Collection ID.
        doc_id: Document ID from the search index.

    Returns:
        API response with status.
    """
    url = f"{API_BASE_URL}/api/collections/{collection_id}/add"
    payload = {"doc_id": doc_id}
    logger.info("add_to_collection: collection=%s id=%s", collection_id, doc_id)
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def find_collection_by_name(name: str) -> dict[str, Any] | None:
    """Find a collection by its name (case-insensitive exact match).

    Args:
        name: Collection name to search for.

    Returns:
        The matching collection, or null if not found.
    """
    url = f"{API_BASE_URL}/api/collections"
    logger.info("find_collection_by_name: name=%s", name)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    target = name.lower()
    for collection in resp.json():
        if collection.get("name", "").lower() == target:
            return collection
    return None


@mcp.tool()
def get_library_entry(doc_id: str) -> dict[str, Any]:
    """Check whether a document is already in the library.

    Args:
        doc_id: Document ID from the search index.

    Returns:
        Object with 'found', 'type' (movies/series/tv_channels), and 'added_at'.
    """
    url = f"{API_BASE_URL}/api/library"
    logger.info("get_library_entry: id=%s", doc_id)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    library = resp.json()

    times_resp = requests.get(f"{API_BASE_URL}/api/library/added-times", timeout=30)
    times_resp.raise_for_status()
    added_times = times_resp.json()

    for key in ("movies", "series", "tv_channels"):
        if doc_id in library.get(key, []):
            return {
                "found": True,
                "type": key,
                "added_at": added_times.get(doc_id),
            }
    return {"found": False}


@mcp.tool()
def get_library() -> list[dict[str, Any]]:
    """List all items currently in the user's library.

    Returns:
        List of objects with 'name' (entry title) and 'type' (movie, series, or tv_channel).
    """
    url = f"{API_BASE_URL}/api/library/expanded"
    logger.info("get_library")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    library = resp.json()

    TYPE_MAP = {"movies": "movie", "series": "series", "tv_channels": "tv_channel"}
    results = []
    for content_type, docs in library.items():
        type_label = TYPE_MAP.get(content_type, content_type)
        for doc in docs:
            name = doc.get("series_name") or doc.get("name") or doc.get("title") or "Unknown"
            results.append({"name": name, "type": type_label})
    return results


@mcp.tool()
def add_metadata_to_movie(movieId: str) -> dict[str, Any]:
    """Search TMDB for a movie and attach the first search result's metadata.

    Args:
        movieId: Document ID of the movie in the search index.

    Returns:
        The stored TMDB metadata, or an error if no search results were found.
    """
    # Fetch the movie document to get its title
    doc_url = f"{API_BASE_URL}/api/search/result/{movieId}"
    logger.info("add_metadata_to_movie: fetching doc %s", movieId)
    doc_resp = requests.get(doc_url, timeout=30)
    doc_resp.raise_for_status()
    doc = doc_resp.json()

    title = doc.get("movie_name") or doc.get("name")
    if not title:
        return {"error": "Could not determine movie title from document"}

    # Strip trailing year like " (2008)" — TMDB search works better without it
    title = re.sub(r"\s*\(\d{4}\)\s*$", "", title).strip()

    # Search TMDB
    search_url = f"{API_BASE_URL}/api/tmdb/search"
    logger.info("add_metadata_to_movie: searching TMDB for '%s'", title)
    search_resp = requests.get(search_url, params={"q": title}, timeout=30)
    search_resp.raise_for_status()
    results = search_resp.json().get("results", [])

    if not results:
        return {"error": f"No TMDB results found for '{title}'"}

    first = results[0]
    tmdb_id = first.get("id")
    if not tmdb_id:
        return {"error": "First TMDB result missing id"}

    # Link metadata to the movie
    link_url = f"{API_BASE_URL}/api/tmdb/movie/{movieId}/link"
    logger.info("add_metadata_to_movie: linking tmdb_id=%s to doc %s", tmdb_id, movieId)
    link_resp = requests.post(link_url, json={"tmdb_id": tmdb_id}, timeout=30)
    link_resp.raise_for_status()
    return link_resp.json()


@mcp.tool()
def get_movie_metadata(id: str) -> dict[str, Any]:
    """Fetch the stored TMDB metadata for a movie.

    Args:
        id: Document ID of the movie in the search index.

    Returns:
        The stored TMDB metadata, or an error if none is found.
    """
    url = f"{API_BASE_URL}/api/tmdb/movie/{id}"
    logger.info("get_movie_metadata: fetching metadata for %s", id)
    resp = requests.get(url, timeout=30)
    if resp.status_code == 404:
        return {"error": "No metadata found for this movie"}
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def add_metadata_to_series(seriesId: str) -> dict[str, Any]:
    """Search TMDB for a TV series and attach the first search result's metadata.

    Args:
        seriesId: Document ID of the series in the search index.

    Returns:
        The stored TMDB metadata, or an error if no search results were found.
    """
    doc_url = f"{API_BASE_URL}/api/search/result/{seriesId}"
    logger.info("add_metadata_to_series: fetching doc %s", seriesId)
    doc_resp = requests.get(doc_url, timeout=30)
    doc_resp.raise_for_status()
    doc = doc_resp.json()

    title = doc.get("name") or doc.get("series_name")
    if not title:
        return {"error": "Could not determine series title from document"}

    title = re.sub(r"\s*\(\d{4}\)\s*$", "", title).strip()

    search_url = f"{API_BASE_URL}/api/tmdb/search/tv"
    logger.info("add_metadata_to_series: searching TMDB for '%s'", title)
    search_resp = requests.get(search_url, params={"q": title}, timeout=30)
    search_resp.raise_for_status()
    results = search_resp.json().get("results", [])

    if not results:
        return {"error": f"No TMDB results found for '{title}'"}

    first = results[0]
    tmdb_id = first.get("id")
    if not tmdb_id:
        return {"error": "First TMDB result missing id"}

    link_url = f"{API_BASE_URL}/api/tmdb/series/{seriesId}/link"
    logger.info("add_metadata_to_series: linking tmdb_id=%s to doc %s", tmdb_id, seriesId)
    link_resp = requests.post(link_url, json={"tmdb_id": tmdb_id}, timeout=30)
    link_resp.raise_for_status()
    return link_resp.json()


@mcp.tool()
def get_series_metadata(id: str) -> dict[str, Any]:
    """Fetch the stored TMDB metadata for a series.

    Args:
        id: Document ID of the series in the search index.

    Returns:
        The stored TMDB metadata, or an error if none is found.
    """
    url = f"{API_BASE_URL}/api/tmdb/series/{id}"
    logger.info("get_series_metadata: fetching metadata for %s", id)
    resp = requests.get(url, timeout=30)
    if resp.status_code == 404:
        return {"error": "No metadata found for this series"}
    resp.raise_for_status()
    return resp.json()


@mcp.tool()
def get_director_films(query: str) -> dict[str, Any]:
    """Search TMDB for a director by name and return their top 10 directed films.

    Args:
        query: Director name to search for (e.g. 'christopher nolan').

    Returns:
        Director info and a list of up to 10 films they directed.
    """
    # Search for the person
    search_url = f"{API_BASE_URL}/api/tmdb/search/person"
    logger.info("get_director_films: searching for '%s'", query)
    search_resp = requests.get(search_url, params={"q": query}, timeout=30)
    search_resp.raise_for_status()
    results = search_resp.json().get("results", [])

    if not results:
        return {"error": f"No person found for '{query}'"}

    person = results[0]
    person_id = person.get("id")
    if not person_id:
        return {"error": "First result missing person ID"}

    # Get their combined credits
    person_url = f"{API_BASE_URL}/api/person/{person_id}"
    logger.info("get_director_films: fetching credits for person %s", person_id)
    person_resp = requests.get(person_url, timeout=30)
    person_resp.raise_for_status()
    person_data = person_resp.json()

    # Filter to movies where this person was director
    directed = [
        c for c in person_data.get("credits", [])
        if c.get("job") == "Director" and c.get("media_type") == "movie"
    ]
    directed = directed[:10]

    return {
        "person": {
            "id": person_data.get("id"),
            "name": person_data.get("name"),
            "biography": person_data.get("biography", ""),
            "profile_url": person_data.get("profile_url"),
        },
        "films": directed,
    }


class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if IPTV_MCP_API_KEY:
            auth = request.headers.get("authorization", "")
            if auth != f"Bearer {IPTV_MCP_API_KEY}":
                logger.warning(
                    "Unauthorized request to %s from %s",
                    request.url.path,
                    request.client.host if request.client else "unknown",
                )
                return PlainTextResponse("Unauthorized", status_code=401)
        return await call_next(request)


def create_app():
    app = mcp.http_app()
    app.add_middleware(APIKeyMiddleware)
    return app


if __name__ == "__main__":
    if not IPTV_MCP_API_KEY:
        logger.warning(
            "IPTV_MCP_API_KEY is not set; the server will accept unauthenticated requests"
        )
    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=8000)
