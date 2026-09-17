"""
Planner data helpers for the Planby EPG view.

Reads the filtered output.m3u / output.xml files and converts them into the
JSON shape expected by the planby React component.
"""

import hashlib
import json
import logging
import os
import uuid as uuid_mod
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from .config_db import get_config
from .m3u_xmltv import M3UParser, XMLTVParser
from .redis_client import get_redis_client

logger = logging.getLogger(__name__)

PLANNER_CACHE_PREFIX = "planner:"
PLANNER_CHANNELS_KEY = f"{PLANNER_CACHE_PREFIX}channels"
PLANNER_EPG_KEY = f"{PLANNER_CACHE_PREFIX}epg"
PLANNER_CACHE_TTL = 12 * 3600  # 12 hours


def _get_output_directory() -> str:
    return get_config("output_directory", "./output")


def _get_redis():
    return get_redis_client()


def _cache_get(key: str):
    client = _get_redis()
    if client is None:
        return None
    try:
        data = client.get(key)
        return json.loads(data) if data else None
    except Exception as e:
        logger.warning("Failed to read planner cache key %s: %s", key, e)
        return None


def _cache_set(key: str, value, ttl: int = PLANNER_CACHE_TTL) -> None:
    client = _get_redis()
    if client is None:
        return
    try:
        client.setex(key, ttl, json.dumps(value))
    except Exception as e:
        logger.warning("Failed to write planner cache key %s: %s", key, e)


def _parse_xmltv_timestamp(ts_string: str) -> Optional[datetime]:
    """Convert XMLTV timestamp like '20260420233000 +0000' to a timezone-aware UTC datetime."""
    if not ts_string:
        return None
    try:
        parts = ts_string.split()
        if len(parts) < 2:
            return None
        dt_str = parts[0]  # YYYYMMDDHHMMSS
        tz_str = parts[1]  # +0000

        year = int(dt_str[0:4])
        month = int(dt_str[4:6])
        day = int(dt_str[6:8])
        hour = int(dt_str[8:10])
        minute = int(dt_str[10:12])
        second = int(dt_str[12:14])

        tz_sign = 1 if tz_str[0] == "+" else -1
        tz_hours = int(tz_str[1:3])
        tz_minutes = int(tz_str[3:5])
        tz_offset = timedelta(seconds=tz_sign * (tz_hours * 3600 + tz_minutes * 60))

        dt = datetime(year, month, day, hour, minute, second, tzinfo=timezone(tz_offset))
        return dt.astimezone(timezone.utc)
    except Exception as e:
        logger.warning("Failed to parse XMLTV timestamp '%s': %s", ts_string, e)
        return None


def _format_local_iso(dt: Optional[datetime], timezone_offset_minutes: int = 0) -> str:
    if dt is None:
        return ""
    local_dt = dt - timedelta(minutes=timezone_offset_minutes)
    return local_dt.strftime("%Y-%m-%dT%H:%M:%S")


def _programme_id(channel_uuid: str, start_iso: str, title: str) -> str:
    """Generate a deterministic UUID for a programme."""
    base = f"{channel_uuid}|{start_iso}|{title}"
    return str(uuid_mod.UUID(hashlib.md5(base.encode("utf-8")).hexdigest()[:32]))


def get_planby_channels(use_cache: bool = True) -> List[Dict]:
    """Return channels in Planby format from filtered output.m3u."""
    if use_cache:
        cached = _cache_get(PLANNER_CHANNELS_KEY)
        if cached is not None:
            return cached

    output_directory = _get_output_directory()
    parser = M3UParser(output_directory)
    raw_channels = parser.parse_m3u("output.m3u")

    channels = []
    seen_uuids = set()
    for ch in raw_channels:
        channel_uuid = ch.get("id", "").strip()
        if not channel_uuid:
            continue
        if channel_uuid in seen_uuids:
            continue
        seen_uuids.add(channel_uuid)

        channels.append(
            {
                "uuid": channel_uuid,
                "logo": ch.get("logo", ""),
                "name": ch.get("name", ""),
                "url": ch.get("url", ""),
            }
        )

    if use_cache:
        _cache_set(PLANNER_CHANNELS_KEY, channels)

    return channels


def get_planby_epg(
    target_date: Optional[datetime] = None,
    timezone_offset_minutes: int = 0,
    use_cache: bool = True,
) -> Tuple[List[Dict], str]:
    """Return EPG items in Planby format for the given local date from filtered output.xml.

    Args:
        target_date: Date to filter programmes for. Defaults to today in the client's timezone.
        timezone_offset_minutes: Client timezone offset from UTC in minutes
            (e.g. -120 for UTC+2, 300 for UTC-5). Matches JavaScript Date.getTimezoneOffset().
        use_cache: Whether to read/write Redis cache.

    Returns:
        Tuple of (epg_items, date_string_used).
    """
    if target_date is None:
        target_date = datetime.now(timezone.utc)

    date_str = target_date.strftime("%Y-%m-%d")
    cache_key = f"{PLANNER_EPG_KEY}:{date_str}:offset:{timezone_offset_minutes}"

    if use_cache:
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached, date_str

    output_directory = _get_output_directory()
    parser = XMLTVParser(output_directory)
    programmes = parser.parse_programmes("output.xml")

    # Build channel map for logo/name/url fallback.
    channels = get_planby_channels(use_cache=use_cache)
    channel_map = {ch["uuid"]: ch for ch in channels}

    # Convert the requested local date into a UTC range.
    client_tz = timezone(timedelta(minutes=timezone_offset_minutes))
    start_of_local_day = datetime(
        target_date.year, target_date.month, target_date.day, tzinfo=client_tz
    )
    start_of_day_utc = start_of_local_day.astimezone(timezone.utc)
    end_of_day_utc = start_of_day_utc + timedelta(days=1)

    epg = []
    seen_ids = set()
    for prog in programmes:
        channel_uuid = prog.get("channel", "").strip()
        if not channel_uuid:
            continue

        start_dt = _parse_xmltv_timestamp(prog.get("start", ""))
        stop_dt = _parse_xmltv_timestamp(prog.get("stop", ""))
        if start_dt is None or stop_dt is None:
            continue

        # Keep programmes that overlap the target local day.
        if stop_dt <= start_of_day_utc or start_dt >= end_of_day_utc:
            continue

        start_iso = _format_local_iso(start_dt, timezone_offset_minutes)
        title = prog.get("title", "").strip()
        prog_id = _programme_id(channel_uuid, start_iso, title)

        # Defensive deduplication.
        if prog_id in seen_ids:
            continue
        seen_ids.add(prog_id)

        channel = channel_map.get(channel_uuid, {})
        epg.append(
            {
                "channelUuid": channel_uuid,
                "id": prog_id,
                "image": channel.get("logo", ""),
                "since": start_iso,
                "till": _format_local_iso(stop_dt, timezone_offset_minutes),
                "title": title,
                "description": prog.get("description", "").strip(),
                "url": channel.get("url", ""),
            }
        )

    if use_cache:
        _cache_set(cache_key, epg)

    return epg, date_str


def invalidate_planner_cache() -> None:
    """Clear all planner-related Redis keys."""
    client = _get_redis()
    if client is None:
        return
    try:
        cursor = 0
        while True:
            cursor, keys = client.scan(cursor=cursor, match=f"{PLANNER_CACHE_PREFIX}*", count=100)
            if keys:
                client.delete(*keys)
            if cursor == 0:
                break
    except Exception as e:
        logger.warning("Failed to invalidate planner cache: %s", e)
