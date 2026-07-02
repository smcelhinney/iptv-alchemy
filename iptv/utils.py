"""
Common utilities for IPTV processing
"""

import logging
import os
import re
import sys
import json
import requests
from typing import List, Dict, Set, Optional, Tuple
from lxml import etree

from .config_db import get_config

logger = logging.getLogger(__name__)


def load_config() -> Dict:
    """Load configuration from SQLite config store."""
    config_data = {}

    # Xtream credentials
    config_data['server_url'] = get_config('xtream_server_url').rstrip('/')
    config_data['username'] = get_config('xtream_username')
    config_data['password'] = get_config('xtream_password')

    # Settings
    config_data['should_overwrite_output'] = bool(int(get_config('should_overwrite_output', '1')))
    config_data['epg_prev_days'] = int(get_config('epg_guide_prev_days', '0'))
    config_data['epg_next_days'] = int(get_config('epg_guide_next_days', '1'))

    # Output directory
    config_data['output_directory'] = get_config('output_directory', os.getcwd())
    os.makedirs(config_data['output_directory'], exist_ok=True)

    # Sub-directory outputs
    config_data['tv_output_directory'] = get_config('tv_output_directory', os.path.join(config_data['output_directory'], 'media', 'tv'))
    os.makedirs(config_data['tv_output_directory'], exist_ok=True)

    config_data['movies_output_directory'] = get_config('movies_output_directory', os.path.join(config_data['output_directory'], 'media', 'movies'))
    os.makedirs(config_data['movies_output_directory'], exist_ok=True)

    # Search exclude regex (global)
    exclude_pattern = get_config('exclude_categories')
    config_data['search_exclude_regex'] = re.compile(exclude_pattern) if exclude_pattern else None

    return config_data


def validate_credentials(server_url: str, username: str, password: str) -> None:
    """Validate that required credentials are present"""
    if not all([server_url, username, password]):
        print("Error: Missing required environment variables (XTREAM_SERVER_URL, XTREAM_USERNAME, XTREAM_PASSWORD)", file=sys.stderr)
        sys.exit(1)


def get_output_path(output_directory: str, *path_components: str) -> str:
    """Construct full path relative to output directory"""
    return os.path.join(output_directory, *path_components)


def format_file_size(size_bytes: int) -> str:
    """Format byte size into human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


def construct_urls(server_url: str, username: str, password: str,
                  epg_prev_days: int, epg_next_days: int) -> Tuple[str, str]:
    """Construct M3U and XMLTV URLs from Xtream credentials"""
    m3u_url = f"{server_url}/get.php?username={username}&password={password}&type=m3u_plus&output=ts"

    # Try different parameter combinations for date limiting
    base_xmltv_url = f"{server_url}/xmltv.php?username={username}&password={password}"

    # Add date range parameters - trying common variations
    params = []
    if epg_prev_days is not None:
        params.append(f"prev_days={epg_prev_days}")
    if epg_next_days is not None:
        params.append(f"next_days={epg_next_days}")

    if params:
        xmltv_url = f"{base_xmltv_url}&{'&'.join(params)}"
    else:
        xmltv_url = base_xmltv_url

    return m3u_url, xmltv_url


def get_etags_path(output_directory: str) -> str:
    """Get path to ETags cache file"""
    return os.path.join(output_directory, '.etags.json')


def load_etags(output_directory: str) -> Dict[str, str]:
    """Load ETags from JSON file"""
    etags_path = get_etags_path(output_directory)
    if os.path.exists(etags_path):
        try:
            with open(etags_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def save_etags(output_directory: str, etags: Dict[str, str]) -> bool:
    """Save ETags to JSON file"""
    etags_path = get_etags_path(output_directory)
    try:
        with open(etags_path, 'w') as f:
            json.dump(etags, f, indent=2)
        return True
    except IOError:
        print(f"Warning: Failed to save ETags to {etags_path}", file=sys.stderr)
        return False


def get_stored_etag(output_directory: str, filename: str) -> Optional[str]:
    """Get stored ETag for a specific file"""
    etags = load_etags(output_directory)
    return etags.get(filename)


def update_etag(output_directory: str, filename: str, etag: str) -> bool:
    """Update stored ETag for a specific file"""
    etags = load_etags(output_directory)
    etags[filename] = etag
    return save_etags(output_directory, etags)


def download_file(url: str, filename: str, output_directory: str, skip_if_present: bool = False) -> bool:
    """Download a file from URL to local filename with progress tracking"""
    try:
        output_path = get_output_path(output_directory, filename)

        # Skip if file exists and skip_if_present is True
        if skip_if_present and os.path.exists(output_path):
            print(f"Using existing {filename}")
            return True

        print(f"Downloading {filename}...", end='', flush=True)

        # Download with streaming
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()

        # Get Content-Length for progress tracking
        total_size = None
        content_length = response.headers.get('Content-Length')
        if content_length:
            total_size = int(content_length)

        downloaded_size = 0
        chunk_size = 8192
        last_update = 0

        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    downloaded_size += len(chunk)

                    # Update progress every 1% or every 512KB
                    if total_size:
                        progress = int((downloaded_size / total_size) * 100)
                        if progress - last_update >= 1:
                            print(f"\r  {progress}% ({format_file_size(downloaded_size)}/{format_file_size(total_size)})", end='', flush=True)
                            last_update = progress
                    else:
                        # Update every 512KB when size is unknown
                        if downloaded_size - last_update >= 512 * 1024:
                            print(f"\r  {format_file_size(downloaded_size)} downloaded", end='', flush=True)
                            last_update = downloaded_size

        print(f"\r✓ Downloaded {filename} ({format_file_size(downloaded_size)})")

        return True

    except requests.RequestException as e:
        print(f"\r✗ Error downloading {filename}: {e}", file=sys.stderr)
        return False


def categorize_channels_by_url(channels: List[Dict[str, str]]) -> Dict[str, List[Dict[str, str]]]:
    """Categorize channels by URL patterns for efficient processing"""
    series_channels = []
    movie_channels = []
    live_tv_channels = []

    for channel in channels:
        channel_url = channel.get('url', '')

        if '/series/' in channel_url:
            series_channels.append(channel)
        elif '/movie/' in channel_url:
            movie_channels.append(channel)
        else:
            live_tv_channels.append(channel)

    categorized = {
        'series': series_channels,
        'movies': movie_channels,
        'live_tv': live_tv_channels
    }

    return categorized


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for cross-platform compatibility"""
    # Remove or replace invalid characters (including forward slashes)
    invalid_chars = r'[<>:"\\|?*/]'
    sanitized = re.sub(invalid_chars, '_', filename)

    # Remove control characters
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', sanitized)

    # Remove square brackets and their contents (common in IPTV metadata)
    sanitized = re.sub(r'\[.*?\]', '', sanitized)

    # Remove curly braces and their contents
    sanitized = re.sub(r'\{.*?\}', '', sanitized)

    # Clean up multiple underscores and spaces
    sanitized = re.sub(r'[_\s]+', ' ', sanitized)

    # Strip leading/trailing spaces and dots
    sanitized = sanitized.strip('. ')

    # Limit length to avoid path issues
    if len(sanitized) > 150:
        sanitized = sanitized[:150].rstrip()

    return sanitized


def generate_output_m3u(channels: List[Dict[str, str]], filename: str,
                       output_directory: str, should_overwrite_output: bool) -> bool:
    """Generate filtered output M3U file"""
    try:
        output_path = get_output_path(output_directory, filename)

        # Check if file exists and overwrite setting
        if os.path.exists(output_path) and not should_overwrite_output:
            return True

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('#EXTM3U\n')

            for channel in channels:
                # Build EXTINF line
                extinf_parts = []

                # Add duration
                extinf_parts.append('#EXTINF:-1')

                # Add tvg-id
                if channel.get('id'):
                    extinf_parts.append(f'tvg-id="{channel["id"]}"')

                # Add tvg-logo
                if channel.get('logo'):
                    extinf_parts.append(f'tvg-logo="{channel["logo"]}"')

                # Add group-title
                if channel.get('category'):
                    extinf_parts.append(f'group-title="{channel["category"]}"')

                # Add channel name
                channel_name = channel.get('name', 'Unknown Channel')
                extinf_line = ' '.join(extinf_parts) + f',{channel_name}'

                f.write(extinf_line + '\n')
                f.write(channel.get('url', '') + '\n')

        return True

    except Exception as e:
        print(f"Error generating output M3U: {e}", file=sys.stderr)
        return False


def generate_output_xml(xmltv_root: etree._Element, filename: str,
                       output_directory: str, should_overwrite_output: bool) -> bool:
    """Generate filtered output XMLTV file"""
    try:
        output_path = get_output_path(output_directory, filename)

        # Check if file exists and overwrite setting
        if os.path.exists(output_path) and not should_overwrite_output:
            return True

        with open(output_path, 'wb') as f:
            f.write(etree.tostring(xmltv_root, encoding='utf-8', xml_declaration=True, pretty_print=True))

        return True

    except Exception as e:
        print(f"Error generating output XMLTV: {e}", file=sys.stderr)
        return False


def get_emby_api_key() -> str:
    """Get Emby API key from config."""
    return get_config('emby_api_key', '')


def get_emby_server() -> str:
    """Get Emby server URL from config."""
    return get_config('emby_server_url', '').rstrip('/')


def trigger_emby_library_refresh() -> bool:
    """Trigger Emby library scan to pick up new media files.

    Returns:
        True if refresh was triggered successfully, False otherwise
    """
    emby_api_key = get_emby_api_key()
    emby_server = get_emby_server()

    if not emby_api_key or not emby_server:
        logger.debug("Emby not configured, skipping library refresh")
        return False

    try:
        url = f"{emby_server}/emby/Library/Refresh?api_key={emby_api_key}"
        resp = requests.post(url, headers={'X-Emby-Token': emby_api_key}, timeout=30)
        logger.info("Emby library refresh triggered: status=%s", resp.status_code)
        if resp.status_code >= 400:
            logger.warning("Emby library refresh returned status %s: %s", resp.status_code, resp.text[:200])
            return False
        return True
    except requests.RequestException as e:
        logger.warning("Failed to trigger Emby library refresh: %s", e)
        return False


def get_jellyfin_api_key() -> str:
    """Get Jellyfin API key from config."""
    return get_config('jellyfin_api_key', '')


def get_jellyfin_server() -> str:
    """Get Jellyfin server URL from config."""
    return get_config('jellyfin_server_url', '').rstrip('/')


def trigger_jellyfin_library_refresh() -> bool:
    """Trigger Jellyfin library scan to pick up new media files.

    Returns:
        True if refresh was triggered successfully, False otherwise
    """
    jellyfin_api_key = get_jellyfin_api_key()
    jellyfin_server = get_jellyfin_server()

    if not jellyfin_api_key or not jellyfin_server:
        logger.debug("Jellyfin not configured, skipping library refresh")
        return False

    try:
        # Jellyfin uses /Library/Refresh (no /emby/ prefix)
        url = f"{jellyfin_server}/Library/Refresh?api_key={jellyfin_api_key}"
        resp = requests.post(url, headers={'X-MediaBrowser-Token': jellyfin_api_key}, timeout=30)
        logger.info("Jellyfin library refresh triggered: status=%s", resp.status_code)
        if resp.status_code >= 400:
            logger.warning("Jellyfin library refresh returned status %s: %s", resp.status_code, resp.text[:200])
            return False
        return True
    except requests.RequestException as e:
        logger.warning("Failed to trigger Jellyfin library refresh: %s", e)
        return False


def trigger_refresh_libraries() -> dict[str, bool]:
    """Trigger library refresh for all configured media servers.

    Returns:
        Dict with keys 'emby' and 'jellyfin' indicating success/failure
    """
    results = {
        'emby': trigger_emby_library_refresh(),
        'jellyfin': trigger_jellyfin_library_refresh(),
    }
    logger.info("Library refresh results: %s", results)
    return results
