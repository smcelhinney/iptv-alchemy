"""Build the "Up next" candidate list for the homepage.

Looks at the user's library and playback memory to find the single most
recently watched incomplete item (movie or series episode).
"""

import logging

logger = logging.getLogger(__name__)

_FINISHED_THRESHOLD = 0.98


def _fetch_meilisearch_doc(doc_id: str):
    """Fetch a single Meilisearch document via the API helper."""
    # Lazy import to avoid a circular dependency with iptv.api
    from .api import _get_meilisearch_document

    try:
        resp = _get_meilisearch_document(doc_id)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        logger.warning("up-next: failed to fetch doc %s: %s", doc_id, e)
    return None


def _is_finished(current_time: float, duration: float) -> bool:
    if duration <= 0:
        return False
    return (current_time / duration) >= _FINISHED_THRESHOLD


def build_up_next(limit: int = 1):
    """Return up to ``limit`` up-next candidates sorted by last watched.

    Each candidate is a dict with:
      - type: "movie" | "series"
      - id: Meilisearch document id
      - doc: the full Meilisearch document
      - progress: { currentTime, duration }
      - lastPlayed: unix timestamp
      - episode: present only for series; the current incomplete episode
    """
    from .library_db import get_library
    from .playback_memory_db import get_all_playback

    library = get_library()
    memory = get_all_playback()

    if not memory:
        return []

    candidates = []

    # Movies: library id == playback memory id
    for movie_id in library.get("movies", []):
        mem = memory.get(movie_id)
        if not mem or mem.get("duration", 0) <= 0:
            continue
        if _is_finished(mem["currentTime"], mem["duration"]):
            continue

        doc = _fetch_meilisearch_doc(movie_id)
        if doc is None:
            continue

        candidates.append(
            {
                "type": "movie",
                "id": movie_id,
                "doc": doc,
                "progress": {
                    "currentTime": mem["currentTime"],
                    "duration": mem["duration"],
                },
                "lastPlayed": mem.get("updatedAt", 0),
            }
        )

    # Series: playback memory is keyed by episode id
    for series_id in library.get("series", []):
        doc = _fetch_meilisearch_doc(series_id)
        if doc is None:
            continue

        episodes = doc.get("episodes", []) or []
        current_ep = None
        current_mem = None
        last_played = 0

        for ep in episodes:
            ep_id = ep.get("id")
            if not ep_id:
                continue
            mem = memory.get(ep_id)
            if not mem or mem.get("duration", 0) <= 0:
                continue
            if _is_finished(mem["currentTime"], mem["duration"]):
                continue

            updated_at = mem.get("updatedAt", 0)
            if updated_at > last_played:
                last_played = updated_at
                current_ep = ep
                current_mem = mem

        if current_ep is None or current_mem is None:
            continue

        candidates.append(
            {
                "type": "series",
                "id": series_id,
                "doc": doc,
                "episode": current_ep,
                "progress": {
                    "currentTime": current_mem["currentTime"],
                    "duration": current_mem["duration"],
                },
                "lastPlayed": last_played,
            }
        )

    candidates.sort(key=lambda c: c["lastPlayed"], reverse=True)
    return candidates[:limit]
