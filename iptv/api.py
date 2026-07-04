#!/usr/bin/env python3
"""
Flask REST API for iptv-alchemy

Exposes processor operations as async REST endpoints. Each POST creates an
in-memory task, runs the work in a background thread, and returns a task ID
for status polling.
"""

import os
import logging
import re
import shutil
import subprocess
import sys
import uuid
import threading
import traceback
from io import StringIO
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests as http_requests

# Load env vars before importing IPTV modules
load_dotenv()

MEILISEARCH_HOST = os.getenv('MEILISEARCH_HOST', 'http://iptv-meilisearch:7700')
MEILISEARCH_API_KEY = os.getenv('MEILISEARCH_API_KEY', 'iptv-alchemy-default-key')
MEILISEARCH_INDEX = 'iptv_content'


def _get_media_root() -> Path:
    from .config_db import get_config
    return Path(get_config('output_directory', './output')) / 'media'


def _get_tv_dir() -> Path:
    from .config_db import get_config
    return Path(get_config('tv_output_directory', './output/media/tv'))


def _get_movies_dir() -> Path:
    from .config_db import get_config
    return Path(get_config('movies_output_directory', './output/media/movies'))


def _get_emby_api_key() -> str:
    from .config_db import get_config
    return get_config('emby_api_key', '')


def _get_emby_server() -> str:
    from .config_db import get_config
    return get_config('emby_server_url', '').rstrip('/')


def _get_jellyfin_api_key() -> str:
    from .config_db import get_config
    return get_config('jellyfin_api_key', '')


def _get_jellyfin_server() -> str:
    from .config_db import get_config
    return get_config('jellyfin_server_url', '').rstrip('/')

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)-8s %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger(__name__)


class _Tee:
    """Write to a StringIO buffer *and* the original stream simultaneously."""

    def __init__(self, buffer: StringIO, fallback):
        self._buffer = buffer
        self._fallback = fallback

    def write(self, text):
        self._buffer.write(text)
        self._fallback.write(text)

    def flush(self):
        self._fallback.flush()

    # StringIO has no fileno – only needed if something calls it
    def fileno(self):
        return self._fallback.fileno()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Propagate the root logging config to Flask/Werkzeug
app.logger.setLevel(logging.INFO)
logging.getLogger('werkzeug').setLevel(logging.INFO)


@app.after_request
def _log_request(response):
    """Log every API request at INFO level, skipping noisy endpoints."""
    logger.info(
        "%s %s %s %s",
        request.method,
        request.path,
        response.status_code,
        f"{response.content_length}b" if response.content_length else "-",
    )
    return response

# In-memory task storage
tasks: dict = {}
tasks_lock = threading.Lock()

# In-memory sync changes tracking
sync_changes: list[dict] = []
sync_changes_lock = threading.Lock()

# Thread pool for background tasks (single worker to enforce one-at-a-time)
executor = ThreadPoolExecutor(max_workers=2)


def _task_dict(task_id):
    """Return a serializable copy of a task record."""
    return dict(tasks[task_id])


def _has_active_task():
    """Check if there is a pending or running task."""
    for t in tasks.values():
        if t['status'] in ('pending', 'running'):
            return True
    return False


def _clean_logs(text):
    """Remove carriage-return progress bar artifacts from captured output."""
    # Replace \r sequences that overwrite the line (progress bars)
    text = re.sub(r'\r[^\n]*', '', text)
    # Collapse multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _trigger_emby_guide_refresh():
    """Trigger Emby's 'Refresh Guide' scheduled task via the Emby API.

    1. GET /emby/ScheduledTasks to discover task IDs
    2. Find the task with Key == 'RefreshGuide'
    3. POST /emby/ScheduledTasks/{id}/Trigger to execute it
    """
    emby_api_key = _get_emby_api_key()
    emby_server = _get_emby_server()
    if not emby_api_key or not emby_server:
        logger.warning("Emby not configured, skipping guide refresh")
        return

    try:
        # Fetch scheduled tasks
        resp = http_requests.get(
            f"{emby_server}/emby/ScheduledTasks?api_key={emby_api_key}",
            headers={'X-Emby-Token': emby_api_key},
            timeout=10,
        )
        resp.raise_for_status()
        tasks_list = resp.json()

        # Find the RefreshGuide task
        guide_task = next(
            (t for t in tasks_list if t.get('Key') == 'RefreshGuide'),
            None,
        )
        if not guide_task or not guide_task.get('Id'):
            logger.warning("RefreshGuide task not found in Emby scheduled tasks")
            return

        task_id = guide_task['Id']
        trigger_resp = http_requests.post(
            f"{emby_server}/emby/ScheduledTasks/Running/{task_id}?api_key={emby_api_key}",
            headers={'X-Emby-Token': emby_api_key},
            timeout=10,
        )
        trigger_resp.raise_for_status()
        logger.info("Emby Refresh Guide triggered (task id=%s)", task_id)

    except http_requests.RequestException as e:
        logger.warning("Failed to trigger Emby guide refresh: %s", e)


def _run_task(task_id, task_type):
    """Execute a processor operation in a background thread."""
    with tasks_lock:
        tasks[task_id]['status'] = 'running'
        tasks[task_id]['started_at'] = datetime.now(timezone.utc).isoformat()

    logger.info("Task %s started  type=%s", task_id[:8], task_type)

    # Capture stdout/stderr *and* let output pass through to the console
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    captured = StringIO()
    sys.stdout = _Tee(captured, old_stdout)
    sys.stderr = _Tee(captured, old_stderr)

    try:
        # Lazy import so Flask can start even if Meilisearch is down
        from .main import AlchemyProcessor

        processor = AlchemyProcessor()

        if task_type == 'download':
            skip = tasks[task_id].get('options', {}).get('skip_if_present', False)
            success = processor.download(skip_if_present=skip)
        elif task_type == 'extract_categories':
            success = processor.extract_categories()
        elif task_type == 'reindex':
            index_type = tasks[task_id].get('options', {}).get('index_type', 'all')
            success = processor.reindex(index_type=index_type)
        elif task_type == 'recreate_iptv':
            success = processor.process_local()
        elif task_type == 'run':
            success = processor.process()
        else:
            success = False

        logs = _clean_logs(captured.getvalue())

        with tasks_lock:
            tasks[task_id]['status'] = 'completed'
            tasks[task_id]['completed_at'] = datetime.now(timezone.utc).isoformat()
            tasks[task_id]['result'] = 'success' if success else 'completed with warnings'
            tasks[task_id]['logs'] = logs

        logger.info("Task %s completed  type=%s  result=%s", task_id[:8], task_type, tasks[task_id]['result'])

        # Trigger Emby guide refresh after recreate_iptv/run tasks
        if success and task_type in ('recreate_iptv', 'run'):
            _trigger_emby_guide_refresh()

    except SystemExit as e:
        # AlchemyProcessor calls sys.exit(1) on config/credential errors
        logs = _clean_logs(captured.getvalue())

        with tasks_lock:
            tasks[task_id]['status'] = 'failed'
            tasks[task_id]['completed_at'] = datetime.now(timezone.utc).isoformat()
            tasks[task_id]['error'] = f"Processor exited with code {e.code}"
            tasks[task_id]['logs'] = logs

        logger.error("Task %s failed  type=%s  exit_code=%s", task_id[:8], task_type, e.code)

    except Exception as e:
        logs = _clean_logs(captured.getvalue())
        tb = traceback.format_exc()

        with tasks_lock:
            tasks[task_id]['status'] = 'failed'
            tasks[task_id]['completed_at'] = datetime.now(timezone.utc).isoformat()
            tasks[task_id]['error'] = str(e)
            tasks[task_id]['logs'] = logs + '\n' + tb if logs else tb

        logger.exception("Task %s failed  type=%s", task_id[:8], task_type)

    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr


def _create_task(task_type, options=None):
    """Create a new task and start it if no other task is active."""
    with tasks_lock:
        if _has_active_task():
            return None, 409

        task_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        tasks[task_id] = {
            'id': task_id,
            'type': task_type,
            'status': 'pending',
            'created_at': now,
            'started_at': None,
            'completed_at': None,
            'result': None,
            'error': None,
            'logs': '',
            'options': options or {},
        }

    executor.submit(_run_task, task_id, task_type)
    logger.info("Task %s queued  type=%s", task_id[:8], task_type)
    return task_id, 202


# --- Task endpoints ---

@app.route('/api/task/download', methods=['POST'])
def api_task_download():
    body = request.get_json(silent=True) or {}
    options = {'skip_if_present': bool(body.get('skip_if_present', False))}
    task_id, code = _create_task('download', options)
    if task_id is None:
        return jsonify({'error': 'A task is already running or pending'}), 409
    return jsonify({'task_id': task_id}), code


@app.route('/api/task/extract-categories', methods=['POST'])
def api_task_extract_categories():
    task_id, code = _create_task('extract_categories')
    if task_id is None:
        return jsonify({'error': 'A task is already running or pending'}), 409
    return jsonify({'task_id': task_id}), code


@app.route('/api/task/reindex', methods=['POST'])
def api_task_reindex():
    body = request.get_json(silent=True) or {}
    options = {'index_type': body.get('index_type', 'all')}
    task_id, code = _create_task('reindex', options)
    if task_id is None:
        return jsonify({'error': 'A task is already running or pending'}), 409
    return jsonify({'task_id': task_id}), code


@app.route('/api/task/recreate-iptv', methods=['POST'])
def api_task_recreate_iptv():
    task_id, code = _create_task('recreate_iptv')
    if task_id is None:
        return jsonify({'error': 'A task is already running or pending'}), 409
    return jsonify({'task_id': task_id}), code


@app.route('/api/task/<task_id>', methods=['GET'])
def api_task_status(task_id):
    with tasks_lock:
        if task_id not in tasks:
            return jsonify({'error': 'Task not found'}), 404
        return jsonify(_task_dict(task_id))


@app.route('/api/tasks', methods=['GET'])
def api_tasks():
    with tasks_lock:
        sorted_tasks = sorted(
            tasks.values(),
            key=lambda t: t['created_at'],
            reverse=True,
        )
        return jsonify([dict(t) for t in sorted_tasks])


# --- Search proxy endpoints ---

_HEADERS = {
    'Authorization': f'Bearer {MEILISEARCH_API_KEY}',
    'Content-Type': 'application/json',
}


@app.route('/api/search/multi-search', methods=['POST', 'OPTIONS'])
def api_multi_search():
    """Proxy multi-search requests to Meilisearch (InstantSearch)."""
    if request.method == 'OPTIONS':
        return '', 204

    body = request.get_json(silent=True) or {}
    # Inject ranking score threshold into every sub query
    queries = body.get('queries', [])
    for query in queries:
        query.setdefault('rankingScoreThreshold', 0.6)

    url = f"{MEILISEARCH_HOST}/multi-search"
    # Don't log the full key, just whether one is configured
    logger.info(
        "multi-search -> %s | queries=%d | api_key_set=%s | host_env=%s",
        url,
        len(queries),
        bool(MEILISEARCH_API_KEY),
        os.getenv('MEILISEARCH_HOST', '(unset)'),
    )

    try:
        resp = http_requests.post(
            url,
            json=body,
            headers=_HEADERS,
            timeout=10,
        )
        if resp.status_code >= 400:
            logger.warning(
                "multi-search upstream error: status=%s body=%s",
                resp.status_code,
                resp.text[:500],
            )
        else:
            logger.info("multi-search ok: status=%s", resp.status_code)
        return (resp.content, resp.status_code,
                {'Content-Type': resp.headers.get('Content-Type', 'application/json')})
    except http_requests.RequestException as e:
        logger.error("multi-search request failed: %s", e)
        return jsonify({'error': f'Multi-search request failed: {e}'}), 502


def _get_meilisearch_document(doc_id: str):
    """Fetch a single document from the Meilisearch index."""
    url = f"{MEILISEARCH_HOST}/indexes/{MEILISEARCH_INDEX}/documents/{doc_id}"
    logger.info("search-result -> %s", url)
    resp = http_requests.get(
        url,
        headers={'Authorization': f'Bearer {MEILISEARCH_API_KEY}'},
        timeout=10,
    )
    if resp.status_code >= 400:
        logger.warning(
            "search-result upstream error: status=%s body=%s",
            resp.status_code,
            resp.text[:500],
        )
    return resp


@app.route('/api/search/result/<path:doc_id>', methods=['GET'])
def api_search_result(doc_id):
    """Proxy single document lookup to Meilisearch."""
    try:
        resp = _get_meilisearch_document(doc_id)
        return (resp.content, resp.status_code,
                {'Content-Type': resp.headers.get('Content-Type', 'application/json')})
    except http_requests.RequestException as e:
        logger.error("search-result request failed: %s", e)
        return jsonify({'error': f'Document lookup failed: {e}'}), 502


# ---------------------------------------------------------------------------
# Stream proxy (transcode + passthrough)
# ---------------------------------------------------------------------------

PROXY_CHUNK_SIZE = 65536


def _should_transcode(source_url, settings):
    """Decide whether to transcode based on settings and URL type."""
    if settings.get('transcode_enabled', 'true') != 'true':
        return False
    return source_url.lower().endswith('.ts')


def _proxy_transcode(source_url):
    """Transcode a live TV stream via ffmpeg to H.264 + AAC MPEG-TS."""
    logger.info("proxy stream transcode: %s", source_url)

    ffmpeg_args = [
        'ffmpeg',
        '-hide_banner',
        '-loglevel', 'warning',
        '-user_agent', 'VLC/3.0.20 LibVLC/3.0.20',
        '-i', source_url,
        '-vf', 'scale=1280:-2',
        '-r', '60',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-tune', 'zerolatency',
        '-profile:v', 'high',
        '-pix_fmt', 'yuv420p',
        '-crf', '20',
        '-maxrate', '5000k',
        '-bufsize', '10000k',
        '-g', '60',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ac', '2',
        '-f', 'mpegts',
        'pipe:1',
    ]

    try:
        proc = subprocess.Popen(
            ffmpeg_args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except FileNotFoundError:
        logger.error("proxy stream: ffmpeg not found on PATH")
        return jsonify({'error': 'ffmpeg not installed on server'}), 500
    except Exception as e:
        logger.error("proxy stream: failed to start ffmpeg: %s", e)
        return jsonify({'error': 'Failed to start transcoder'}), 500

    def generate():
        try:
            while True:
                chunk = proc.stdout.read(PROXY_CHUNK_SIZE)
                if not chunk:
                    break
                yield chunk
        finally:
            logger.info("proxy stream transcode disconnected: %s", source_url)
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()
            if proc.returncode is not None and proc.returncode < 0:
                stderr_output = proc.stderr.read().decode('utf-8', errors='replace').strip()
                if stderr_output:
                    logger.warning("proxy stream ffmpeg stderr:\n%s", stderr_output[-2000:])
            else:
                proc.stderr.read()

    return Response(
        generate(),
        status=200,
        headers={
            'Content-Type': 'video/mp2t',
            'Cache-Control': 'no-cache, no-store',
            'Connection': 'keep-alive',
        },
    )


def _proxy_passthrough(source_url, range_header):
    """Pass-through proxy: follow redirects, forward headers, stream bytes."""
    logger.info("proxy stream passthrough: %s", source_url)

    upstream_headers = {}
    if range_header:
        upstream_headers['Range'] = range_header

    try:
        upstream = http_requests.get(
            source_url,
            headers=upstream_headers,
            stream=True,
            timeout=30,
        )
    except http_requests.RequestException as e:
        logger.error("proxy stream passthrough failed for %s: %s", source_url, e)
        return jsonify({'error': 'Upstream unreachable'}), 502

    resp_headers = {}
    for key in ('Content-Type', 'Content-Range', 'Content-Length', 'Accept-Ranges'):
        if key in upstream.headers:
            resp_headers[key] = upstream.headers[key]

    def generate():
        try:
            for chunk in upstream.iter_content(chunk_size=PROXY_CHUNK_SIZE):
                if chunk:
                    yield chunk
        finally:
            logger.info("proxy stream passthrough disconnected: %s", source_url)
            upstream.close()

    return Response(
        generate(),
        status=upstream.status_code,
        headers=resp_headers,
    )


@app.route('/api/proxy/stream', methods=['GET', 'OPTIONS'])
def api_proxy_stream():
    """Unified stream proxy.

    Routes all video content through the backend so the browser only
    communicates over HTTPS. When transcoding is enabled (and the source
    is a .ts live stream), pipes through ffmpeg. Otherwise, passes the
    stream through directly following redirects and forwarding headers.
    """
    if request.method == 'OPTIONS':
        return Response()

    source_url = request.args.get('url')
    if not source_url:
        return jsonify({'error': 'Missing url query parameter'}), 400

    # Read transcode setting from Redis
    try:
        from .settings_db import get_settings
        settings = get_settings()
    except Exception:
        settings = {}

    range_header = request.headers.get('Range', '')

    if _should_transcode(source_url, settings):
        return _proxy_transcode(source_url)
    else:
        return _proxy_passthrough(source_url, range_header)


# ---------------------------------------------------------------------------
# Image proxy with filesystem cache
# ---------------------------------------------------------------------------

IMG_CACHE_DIR = Path('/tmp/img_cache')
IMG_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _img_cache_path(url: str) -> Path:
    """Return the cache file path for a given image URL."""
    import hashlib
    h = hashlib.sha256(url.encode()).hexdigest()[:16]
    return IMG_CACHE_DIR / h


@app.route('/api/proxy/img', methods=['GET', 'OPTIONS'])
def api_proxy_img():
    """Proxy and cache non-HTTPS images for mixed-content avoidance.

    Fetches the image, stores it in /tmp/img_cache, and serves it with
    the correct Content-Type. Subsequent requests for the same URL are
    served from disk.
    """
    if request.method == 'OPTIONS':
        return Response()

    source_url = request.args.get('url')
    if not source_url:
        return jsonify({'error': 'Missing url query parameter'}), 400

    cache_file = _img_cache_path(source_url)

    # Serve from cache
    if cache_file.is_file():
        cached_content_type = cache_file.with_suffix('.ctype').read_text().strip() or 'image/jpeg'
        return Response(
            cache_file.read_bytes(),
            status=200,
            headers={'Content-Type': cached_content_type, 'Cache-Control': 'public, max-age=604800'},
        )

    # Fetch from upstream
    try:
        resp = http_requests.get(source_url, timeout=15)
    except http_requests.RequestException as e:
        logger.warning("proxy img fetch failed for %s: %s", source_url, e)
        return jsonify({'error': 'Image fetch failed'}), 502

    if resp.status_code != 200 or not resp.content:
        logger.warning("proxy img upstream returned %s for %s", resp.status_code, source_url)
        return jsonify({'error': 'Image not found'}), resp.status_code if resp.status_code == 404 else 502

    content_type = resp.headers.get('Content-Type', 'image/jpeg')

    # Write to cache
    try:
        cache_file.write_bytes(resp.content)
        cache_file.with_suffix('.ctype').write_text(content_type)
    except Exception as e:
        logger.warning("proxy img cache write failed: %s", e)

    return Response(
        resp.content,
        status=200,
        headers={'Content-Type': content_type, 'Cache-Control': 'public, max-age=604800'},
    )


# --- Emby integration endpoints ---

def _sanitize_path_name(name: str) -> str:
    """Replace characters that are illegal or problematic in file/directory names."""
    # '/' is a path separator; also strip control chars and leading/trailing whitespace
    return name.replace('/', '_').replace('\x00', '').strip()


# Reverse lookup: map sanitized directory names back to original names
def _build_tv_lookup(tv_dir: Path) -> dict[str, str]:
    """Return {sanitized_dir_name: original_name} by reading .name files."""
    lookup = {}
    if not tv_dir.is_dir():
        return lookup
    for series_dir in tv_dir.iterdir():
        if not series_dir.is_dir():
            continue
        name_file = series_dir / '.name'
        if name_file.is_file():
            lookup[series_dir.name] = name_file.read_text().strip()
        else:
            # Fallback: assume directory name IS the original name
            lookup[series_dir.name] = series_dir.name
    return lookup


def _build_movies_lookup(movies_dir: Path) -> dict[str, str]:
    """Return {sanitized_dir_name: original_name} for movie directories."""
    lookup = {}
    if not movies_dir.is_dir():
        return lookup
    for d in movies_dir.iterdir():
        if not d.is_dir():
            continue
        name_file = d / '.name'
        if name_file.is_file():
            lookup[d.name] = name_file.read_text().strip()
        else:
            lookup[d.name] = d.name
    return lookup


@app.route('/api/emby/status', methods=['GET'])
def api_emby_status():
    """Return a snapshot of what's already in output/media."""
    result = {'tv': {}, 'movies': [], 'series_ids': [], 'movie_ids': []}

    with sync_changes_lock:
        result['sync_status'] = {'pending_changes': len(sync_changes), 'changes': list(sync_changes)}

    tv_dir = _get_tv_dir()
    tv_lookup = _build_tv_lookup(tv_dir)
    if tv_dir.is_dir():
        for series_dir in sorted(tv_dir.iterdir()):
            if not series_dir.is_dir():
                continue
            seasons: dict = {}
            for season_dir in sorted(series_dir.iterdir()):
                if not season_dir.is_dir():
                    continue
                eps = sorted(
                    f.stem for f in season_dir.iterdir()
                    if f.is_file() and (f.suffix == '.strm' or f.suffix in ('.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv'))
                )
                if eps:
                    seasons[season_dir.name] = eps
            if seasons:
                result['tv'][tv_lookup.get(series_dir.name, series_dir.name)] = seasons
                id_file = series_dir / '.id'
                if id_file.is_file():
                    result['series_ids'].append(id_file.read_text().strip())

    movies_dir = _get_movies_dir()
    movies_lookup = _build_movies_lookup(movies_dir)
    if movies_dir.is_dir():
        for d in movies_dir.iterdir():
            if not d.is_dir():
                continue
            # Check for .strm files OR video files
            has_strm = any(f.suffix == '.strm' for f in d.iterdir() if f.is_file())
            has_video = any(f.suffix in ('.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv') for f in d.iterdir() if f.is_file())
            if has_strm or has_video:
                result['movies'].append(movies_lookup.get(d.name, d.name))
                id_file = d / '.id'
                if id_file.is_file():
                    result['movie_ids'].append(id_file.read_text().strip())
        result['movies'].sort()

    return jsonify(result)


@app.route('/api/emby/add', methods=['POST', 'OPTIONS'])
def api_emby_add():
    """Create .strm files for a series season (or movie) so Emby can pick them up."""
    if request.method == 'OPTIONS':
        return '', 204

    body = request.get_json(silent=True) or {}
    content_type = body.get('type')
    doc_id = body.get('id')

    if not doc_id or not content_type:
        return jsonify({'error': 'Missing required fields: id, type'}), 400

    if content_type == 'series':
        season = body.get('season')
        episode = body.get('episode')
        if season is None:
            return jsonify({'error': 'Missing required field: season'}), 400

        # Fetch full document from Meilisearch
        try:
            resp = http_requests.get(
                f"{MEILISEARCH_HOST}/indexes/{MEILISEARCH_INDEX}/documents/{doc_id}",
                headers={'Authorization': f'Bearer {MEILISEARCH_API_KEY}'},
                timeout=10,
            )
            resp.raise_for_status()
            doc = resp.json()
        except http_requests.RequestException as e:
            return jsonify({'error': f'Failed to fetch document: {e}'}), 502

        episodes = doc.get('episodes', [])
        series_name = doc.get('series_name') or doc.get('name', 'Unknown')
        safe_name = _sanitize_path_name(series_name)

        # Filter to the requested season
        season_eps = [ep for ep in episodes if (ep.get('season') or 0) == season]
        if not season_eps:
            return jsonify({'error': f'No episodes found for season {season}'}), 404

        # Optionally filter to a single episode
        if episode is not None:
            season_eps = [ep for ep in season_eps if (ep.get('episode') or 0) == episode]
            if not season_eps:
                return jsonify({'error': f'Episode {episode} not found in season {season}'}), 404

        # Build paths using sanitized name
        series_dir = _get_tv_dir() / safe_name
        season_dir = series_dir / f"Season {season:02d}"
        season_dir.mkdir(parents=True, exist_ok=True)

        # Store original name so status/remove can look it up
        (series_dir / '.name').write_text(series_name)
        (series_dir / '.id').write_text(doc_id)

        created = []
        skipped = []
        for ep in sorted(season_eps, key=lambda e: e.get('episode', 0)):
            ep_num = ep.get('episode', 0)
            filename = f"{safe_name} S{season:02d}E{ep_num:02d}.strm"
            filepath = season_dir / filename

            if filepath.exists():
                skipped.append(str(filepath))
                continue

            filepath.write_text(ep['url'])
            created.append(str(filepath))

        if created:
            with sync_changes_lock:
                sync_changes.append({
                    'action': 'add',
                    'type': 'series',
                    'name': series_name,
                    'season': season,
                    'count': len(created),
                })

        return jsonify({
            'series': series_name,
            'season': season,
            'created': created,
            'skipped': skipped,
        })

    if content_type == 'movie':
        # Fetch full document from Meilisearch
        try:
            resp = http_requests.get(
                f"{MEILISEARCH_HOST}/indexes/{MEILISEARCH_INDEX}/documents/{doc_id}",
                headers={'Authorization': f'Bearer {MEILISEARCH_API_KEY}'},
                timeout=10,
            )
            resp.raise_for_status()
            doc = resp.json()
        except http_requests.RequestException as e:
            return jsonify({'error': f'Failed to fetch document: {e}'}), 502

        # name field includes the year, e.g. "Untold Chess Mates (2026)"
        movie_name = doc.get('name', 'Unknown')
        safe_name = _sanitize_path_name(movie_name)
        url = doc.get('url', '')

        if not url:
            return jsonify({'error': 'Movie has no stream URL'}), 400

        movie_dir = _get_movies_dir() / safe_name
        movie_dir.mkdir(parents=True, exist_ok=True)

        # Store original name so status/remove can look it up
        (movie_dir / '.name').write_text(movie_name)
        (movie_dir / '.id').write_text(doc_id)

        filepath = movie_dir / f"{safe_name}.strm"

        if filepath.exists():
            return jsonify({
                'movie': movie_name,
                'created': [],
                'skipped': [str(filepath)],
            })

        filepath.write_text(url)

        with sync_changes_lock:
            sync_changes.append({
                'action': 'add',
                'type': 'movie',
                'name': movie_name,
            })

        return jsonify({
            'movie': movie_name,
            'created': [str(filepath)],
            'skipped': [],
        })

    return jsonify({'error': f'Unsupported content type: {content_type}'}), 400


@app.route('/api/emby/remove', methods=['POST', 'OPTIONS'])
def api_emby_remove():
    """Remove .strm files for a series season or movie from the media directory."""
    if request.method == 'OPTIONS':
        return '', 204

    body = request.get_json(silent=True) or {}
    content_type = body.get('type')

    # Infer type from provided fields when not explicitly given
    if not content_type:
        if body.get('series_name') and body.get('season') is not None:
            content_type = 'series'
        elif body.get('movie_name'):
            content_type = 'movie'
        else:
            return jsonify({'error': 'Unable to determine content type; provide series_name+season or movie_name'}), 400

    if content_type == 'series':
        season = body.get('season')
        series_name = body.get('series_name')
        episode = body.get('episode')
        if season is None or not series_name:
            return jsonify({'error': 'Missing required fields: series_name, season'}), 400

        safe_name = _sanitize_path_name(series_name)
        season_dir = _get_tv_dir() / safe_name / f"Season {season:02d}"

        if episode is not None:
            # Single-episode removal
            filename = f"{safe_name} S{season:02d}E{episode:02d}.strm"
            filepath = season_dir / filename
            if not filepath.is_file():
                return jsonify({'error': f'Episode file not found'}), 404

            filepath.unlink()

            # Clean up empty season dir
            if season_dir.is_dir() and not any(f.is_file() for f in season_dir.iterdir()):
                shutil.rmtree(season_dir)

            # Clean up empty series dir
            series_dir = _get_tv_dir() / safe_name
            if series_dir.is_dir() and not any(d.is_dir() for d in series_dir.iterdir()):
                shutil.rmtree(series_dir)

            with sync_changes_lock:
                sync_changes.append({
                    'action': 'remove',
                    'type': 'series',
                    'name': series_name,
                    'season': season,
                })

            return jsonify({
                'series': series_name,
                'season': season,
                'episode': episode,
                'removed': str(filepath),
            })

        # Whole-season removal
        if not season_dir.is_dir():
            return jsonify({'error': f'Season directory not found'}), 404

        shutil.rmtree(season_dir)

        # Clean up series directory if no season dirs remain
        series_dir = _get_tv_dir() / safe_name
        if series_dir.is_dir() and not any(d.is_dir() for d in series_dir.iterdir()):
            shutil.rmtree(series_dir)

        with sync_changes_lock:
            sync_changes.append({
                'action': 'remove',
                'type': 'series',
                'name': series_name,
                'season': season,
            })

        return jsonify({
            'series': series_name,
            'season': season,
            'removed': str(season_dir),
        })

    if content_type == 'movie':
        movie_name = body.get('movie_name')
        if not movie_name:
            return jsonify({'error': 'Missing required field: movie_name'}), 400

        safe_name = _sanitize_path_name(movie_name)
        movie_dir = _get_movies_dir() / safe_name
        if not movie_dir.is_dir():
            return jsonify({'error': f'Movie directory not found'}), 404

        shutil.rmtree(movie_dir)

        with sync_changes_lock:
            sync_changes.append({
                'action': 'remove',
                'type': 'movie',
                'name': movie_name,
            })

        return jsonify({
            'movie': movie_name,
            'removed': str(movie_dir),
        })

    return jsonify({'error': f'Unsupported content type: {content_type}'}), 400


@app.route('/api/media/sync', methods=['POST', 'OPTIONS'])
def api_media_sync():
    """Trigger library refresh for all configured media servers and clear pending sync changes."""
    if request.method == 'OPTIONS':
        return '', 204

    from .utils import trigger_refresh_libraries

    results = trigger_refresh_libraries()

    cleared_count = 0
    with sync_changes_lock:
        cleared_count = len(sync_changes)
        sync_changes.clear()

    logger.info("Media library sync triggered, cleared %d pending changes", cleared_count)
    return jsonify({'status': 'ok', 'cleared_changes': cleared_count, 'refresh_results': results})


@app.route('/api/media/sync/discard', methods=['POST', 'OPTIONS'])
def api_media_sync_discard():
    """Discard pending sync changes without triggering library refresh, also removes added files."""
    if request.method == 'OPTIONS':
        return '', 204

    cleared_count = 0
    removed_files = []

    with sync_changes_lock:
        cleared_count = len(sync_changes)
        changes_to_discard = list(sync_changes)
        sync_changes.clear()

    # Remove files that were added
    for change in changes_to_discard:
        if change.get('action') == 'add':
            content_type = change.get('type')
            name = change.get('name')

            if content_type == 'series' and name:
                safe_name = _sanitize_path_name(name)
                season = change.get('season')
                if season is not None:
                    season_dir = _get_tv_dir() / safe_name / f"Season {season:02d}"
                    if season_dir.is_dir():
                        shutil.rmtree(season_dir)
                        removed_files.append(str(season_dir))
                        logger.info("Discarded series season: %s Season %d", name, season)

                    # Clean up empty series directory
                    series_dir = _get_tv_dir() / safe_name
                    if series_dir.is_dir() and not any(d.is_dir() for d in series_dir.iterdir()):
                        shutil.rmtree(series_dir)
                        removed_files.append(str(series_dir))

            elif content_type == 'movie' and name:
                safe_name = _sanitize_path_name(name)
                movie_dir = _get_movies_dir() / safe_name
                if movie_dir.is_dir():
                    shutil.rmtree(movie_dir)
                    removed_files.append(str(movie_dir))
                    logger.info("Discarded movie: %s", name)

    logger.info("Media sync changes discarded, cleared %d pending changes, removed %d files", cleared_count, len(removed_files))
    return jsonify({'status': 'ok', 'discarded_changes': cleared_count, 'removed_files': len(removed_files)})


# --- Config endpoints ---

@app.route('/api/config', methods=['GET'])
def api_get_config():
    """Return all config values, masking sensitive fields."""
    from .config_db import get_all_config
    return jsonify(get_all_config(mask_secrets=True))


@app.route('/api/config', methods=['PUT'])
def api_set_config():
    """Update config values. Mask strings are skipped so passwords aren't blanked."""
    from .config_db import set_config
    body = request.get_json(silent=True) or {}
    if not body:
        return jsonify({'error': 'No values provided'}), 400
    set_config(body)
    return jsonify({'status': 'ok'})


# --- Settings endpoints (user preferences) ---

@app.route('/api/settings', methods=['GET'])
def api_get_settings():
    """Return all user settings (subtitle size, etc.)."""
    from .settings_db import get_settings
    return jsonify(get_settings())


@app.route('/api/settings', methods=['PUT'])
def api_set_settings():
    """Update user settings."""
    from .settings_db import set_settings
    body = request.get_json(silent=True) or {}
    if not body:
        return jsonify({'error': 'No values provided'}), 400
    set_settings(body)
    return jsonify({'status': 'ok'})


# --- Category endpoints ---

_CONTENT_TYPE_MAP = {
    'movies': 'movies',
    'series': 'series',
    'tv-listings': 'tv_listings',
}


@app.route('/api/categories/<content_type>', methods=['GET'])
def api_get_categories(content_type):
    """Return cached categories and current selections for a content type."""
    db_type = _CONTENT_TYPE_MAP.get(content_type)
    if not db_type:
        return jsonify({'error': f'Unknown content type: {content_type}'}), 400

    from .config_db import get_selected_categories
    from .redis_client import get_cached_categories

    categories = get_cached_categories(db_type)
    selected = get_selected_categories(db_type)

    return jsonify({
        'categories': categories,
        'selected': selected,
    })


@app.route('/api/categories/<content_type>/selected', methods=['PUT'])
def api_set_categories(content_type):
    """Set selected categories for a content type."""
    db_type = _CONTENT_TYPE_MAP.get(content_type)
    if not db_type:
        return jsonify({'error': f'Unknown content type: {content_type}'}), 400

    body = request.get_json(silent=True) or {}
    categories = body.get('categories')
    if not isinstance(categories, list):
        return jsonify({'error': 'categories must be a list'}), 400

    from .config_db import set_selected_categories
    set_selected_categories(db_type, categories)
    return jsonify({'status': 'ok'})


# --- Onboarding endpoints ---

@app.route('/api/onboarding/status', methods=['GET'])
def api_onboarding_status():
    """Return whether onboarding has been completed.

    Onboarding is considered complete if either the ``has_onboarded`` flag is
    set OR valid Xtream credentials (server url + username + password) are
    present in the config store. This lets pre-configured instances skip the
    wizard automatically.
    """
    import json as _json
    from .config_db import get_config

    has_onboarded = get_config('has_onboarded', '') == 'true'

    # Bypass onboarding if Xtream credentials are already configured
    if not has_onboarded:
        xtream_url = get_config('xtream_server_url', '')
        xtream_user = get_config('xtream_username', '')
        xtream_pass = get_config('xtream_password', '')
        if xtream_url and xtream_user and xtream_pass:
            has_onboarded = True

    onboarding_step = get_config('onboarding_step', '')
    current_task_raw = get_config('onboarding_task', '')
    current_task = None
    if current_task_raw:
        try:
            current_task = _json.loads(current_task_raw)
        except (_json.JSONDecodeError, ValueError):
            current_task = None

    # Reset stale onboarding step from old 5-step flow
    valid_steps = ('setup', 'download-and-filters', 'build-library')
    if onboarding_step and onboarding_step not in valid_steps:
        from .config_db import set_config
        onboarding_step = 'setup'
        set_config({'onboarding_step': 'setup'})

    return jsonify({'has_onboarded': has_onboarded, 'onboarding_step': onboarding_step, 'current_task': current_task})


@app.route('/api/onboarding/step', methods=['PUT'])
def api_onboarding_step():
    """Save the current onboarding step and optional running task so they can be restored after refresh."""
    import json as _json
    from .config_db import set_config
    body = request.get_json(silent=True) or {}
    updates = {}
    step = body.get('step')
    if step is not None:
        valid_steps = ('setup', 'download-and-filters', 'build-library')
        if step not in valid_steps:
            return jsonify({'error': f'Invalid step. Must be one of: {", ".join(valid_steps)}'}), 400
        updates['onboarding_step'] = step

    if 'current_task' in body:
        current_task = body['current_task']
        if current_task:
            updates['onboarding_task'] = _json.dumps(current_task)
        else:
            updates['onboarding_task'] = ''

    if updates:
        set_config(updates)
    return jsonify({'status': 'ok'})


@app.route('/api/onboarding/validate-iptv', methods=['POST'])
def api_onboarding_validate_iptv():
    """Validate Xtream credentials via HEAD request to player_api.

    Saves credentials to config DB if valid. If the password equals the
    mask string '********', reads the current password from the DB instead.
    """
    from .config_db import get_config, set_config

    body = request.get_json(silent=True) or {}
    server_url = (body.get('xtream_server_url') or '').rstrip('/')
    username = body.get('xtream_username', '')
    password = body.get('xtream_password', '')

    if not server_url or not username or not password:
        return jsonify({'valid': False, 'error': 'Server URL, username, and password are required'}), 400

    # Handle masked password: read current from DB
    if password == '********':
        password = get_config('xtream_password', '')

    # Validate via HEAD request to player_api
    try:
        resp = http_requests.head(
            f"{server_url}/player_api.php?username={username}&password={password}",
            timeout=10,
        )
        if resp.status_code == 200:
            set_config({
                'xtream_server_url': server_url,
                'xtream_username': username,
                'xtream_password': password,
            })
            return jsonify({'valid': True})
        else:
            return jsonify({'valid': False, 'error': f'Server returned HTTP {resp.status_code}'})

    except http_requests.ConnectionError:
        return jsonify({'valid': False, 'error': 'Cannot connect to server. Check the URL and try again.'})
    except http_requests.Timeout:
        return jsonify({'valid': False, 'error': 'Connection timed out. The server may be down or unreachable.'})
    except http_requests.RequestException as e:
        return jsonify({'valid': False, 'error': f'Connection error: {e}'})


@app.route('/api/onboarding/validate-dirs', methods=['POST'])
def api_onboarding_validate_dirs():
    """Validate output directories: check existence, try to create, check writability.

    Returns per-directory results. Saves valid dirs to config.
    """
    from .config_db import set_config

    body = request.get_json(silent=True) or {}
    dirs_to_check = {
        'output_directory': body.get('output_directory', ''),
        'tv_output_directory': body.get('tv_output_directory', ''),
        'movies_output_directory': body.get('movies_output_directory', ''),
    }

    results = {}
    valid = True

    for key, path_str in dirs_to_check.items():
        if not path_str:
            results[key] = {'valid': False, 'error': 'Path is required'}
            valid = False
            continue

        p = Path(path_str)
        try:
            p.mkdir(parents=True, exist_ok=True)
            # Test writability
            test_file = p / '.write_test'
            test_file.write_text('test')
            test_file.unlink()
            results[key] = {'valid': True, 'path': str(p)}
        except PermissionError:
            results[key] = {
                'valid': False,
                'error': f'Permission denied. If running in Docker, ensure the directory is mounted with write access (e.g., add "-v /your/path:{p}" to your docker-compose volumes).',
            }
            valid = False
        except OSError as e:
            results[key] = {
                'valid': False,
                'error': f'Cannot create directory: {e}',
            }
            valid = False

    if valid:
        set_config(dirs_to_check)

    return jsonify({'valid': valid, 'results': results})


@app.route('/api/onboarding/filters', methods=['POST'])
def api_onboarding_filters():
    """Batch save: exclude_categories config + all 3 selected_categories entries."""
    from .config_db import set_config, set_selected_categories

    body = request.get_json(silent=True) or {}

    # Save exclude regex
    config_updates = {}
    if 'exclude_categories' in body:
        config_updates['exclude_categories'] = body['exclude_categories']

    if config_updates:
        set_config(config_updates)

    # Save category selections for each content type
    _TYPE_MAP = {'movies': 'movies', 'series': 'series', 'tv_listings': 'tv_listings'}
    for content_type, categories in body.get('selected_categories', {}).items():
        db_type = _TYPE_MAP.get(content_type)
        if db_type and isinstance(categories, list):
            set_selected_categories(db_type, categories)

    return jsonify({'status': 'ok'})


@app.route('/api/onboarding/complete', methods=['POST'])
def api_onboarding_complete():
    """Mark onboarding as completed."""
    from .config_db import set_config
    set_config({'has_onboarded': 'true'})
    return jsonify({'status': 'ok'})


# ---------------------------------------------------------------------------
# Library
# ---------------------------------------------------------------------------

@app.route('/api/library', methods=['GET'])
def api_get_library():
    from .library_db import get_library
    return jsonify(get_library())


@app.route('/api/library/add', methods=['POST'])
def api_add_to_library():
    from .library_db import add_to_library
    body = request.get_json(silent=True) or {}
    type_str = body.get('type')
    doc_id = body.get('id')
    if not type_str or not doc_id:
        return jsonify({'error': 'type and id are required'}), 400
    added = add_to_library(type_str, doc_id)
    return jsonify({'status': 'ok', 'added': added})


@app.route('/api/library/<type>/<id>', methods=['DELETE'])
def api_remove_from_library(type: str, id: str):
    from .library_db import remove_from_library
    remove_from_library(type, id)
    return jsonify({'status': 'ok'})


@app.route('/api/library/added-times', methods=['GET'])
def api_get_added_times():
    from .library_db import get_all_added_times
    return jsonify(get_all_added_times())


@app.route('/api/library/expanded', methods=['GET'])
def api_get_library_expanded():
    """Return the user's library with full Meilisearch documents.

    Useful for mobile clients that want the library contents in a single call
    instead of resolving IDs through repeated search lookups.
    """
    from .library_db import get_library

    library = get_library()
    expanded = {'movies': [], 'series': [], 'tv_channels': []}

    for content_type, doc_ids in library.items():
        target = expanded.get(content_type)
        if target is None:
            continue
        for doc_id in doc_ids:
            try:
                resp = _get_meilisearch_document(doc_id)
                if resp.status_code == 200:
                    target.append(resp.json())
                else:
                    logger.warning(
                        "library/expanded: missing document %s (status %s)",
                        doc_id,
                        resp.status_code,
                    )
            except http_requests.RequestException as e:
                logger.warning(
                    "library/expanded: failed to fetch document %s: %s",
                    doc_id,
                    e,
                )

    return jsonify(expanded)


# ---------------------------------------------------------------------------
# Collections
# ---------------------------------------------------------------------------


@app.route('/api/collections', methods=['GET'])
def api_get_collections():
    from .library_db import get_collections
    col_type = request.args.get('type')
    return jsonify(get_collections(type=col_type))


@app.route('/api/collections', methods=['POST'])
def api_create_collection():
    from .library_db import create_collection
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    col_type = (data.get('type') or 'movies').strip().lower()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    result = create_collection(name, col_type)
    if result is None:
        return jsonify({'error': 'Failed to create collection'}), 500
    logger.info("collection created: %s (%s) [%s]", result['id'], result['name'], result['type'])
    return jsonify(result), 201


@app.route('/api/collections/<col_id>', methods=['GET'])
def api_get_collection(col_id):
    from .library_db import get_collection, get_collection_items
    col = get_collection(col_id)
    if col is None:
        return jsonify({'error': 'Collection not found'}), 404
    items = get_collection_items(col_id)
    return jsonify({'id': col_id, 'name': col['name'], 'type': col['type'], 'items': items})


@app.route('/api/collections/<col_id>', methods=['DELETE'])
def api_delete_collection(col_id):
    from .library_db import delete_collection
    delete_collection(col_id)
    logger.info("collection deleted: %s", col_id)
    return jsonify({'status': 'ok'})


@app.route('/api/collections/<col_id>/add', methods=['POST'])
def api_add_to_collection(col_id):
    from .library_db import add_to_collection
    data = request.get_json(silent=True) or {}
    doc_id = data.get('movie_id') or data.get('doc_id')
    if not doc_id:
        return jsonify({'error': 'movie_id is required'}), 400
    ok = add_to_collection(col_id, doc_id)
    if not ok:
        return jsonify({'error': 'Collection not found'}), 404
    return jsonify({'status': 'ok'})


@app.route('/api/collections/<col_id>/remove', methods=['POST'])
def api_remove_from_collection(col_id):
    from .library_db import remove_from_collection
    data = request.get_json(silent=True) or {}
    doc_id = data.get('movie_id') or data.get('doc_id')
    if not doc_id:
        return jsonify({'error': 'movie_id is required'}), 400
    remove_from_collection(col_id, doc_id)
    return jsonify({'status': 'ok'})


@app.route('/api/collections/doc/<doc_id>', methods=['GET'])
def api_get_doc_collections(doc_id):
    """Return collection IDs that contain this document."""
    from .library_db import get_doc_collections
    return jsonify(get_doc_collections(doc_id))


# ---------------------------------------------------------------------------
# Playback Memory
# ---------------------------------------------------------------------------


@app.route('/api/playback/memory', methods=['GET'])
def api_get_playback_memory():
    from .playback_memory_db import get_all_playback
    return jsonify(get_all_playback())


@app.route('/api/playback/memory', methods=['PUT'])
def api_save_playback():
    from .playback_memory_db import save_playback
    body = request.get_json(silent=True) or {}
    hit_id = body.get('id')
    current_time = body.get('currentTime')
    duration = body.get('duration', 0)
    if not hit_id or current_time is None:
        return jsonify({'error': 'id and currentTime are required'}), 400
    save_playback(hit_id, float(current_time), float(duration))
    return jsonify({'status': 'ok'})


@app.route('/api/playback/memory/<id>', methods=['DELETE'])
def api_delete_playback(id: str):
    from .playback_memory_db import delete_playback
    delete_playback(id)
    return jsonify({'status': 'ok'})


@app.route('/api/playback/last-played', methods=['GET'])
def api_get_last_played():
    from .playback_memory_db import get_all_last_played
    return jsonify(get_all_last_played())


# ---------------------------------------------------------------------------
# TMDB Metadata
# ---------------------------------------------------------------------------


@app.route('/api/tmdb/search', methods=['GET'])
def api_tmdb_search():
    from .tmdb import search_movie
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'q parameter is required'}), 400
    results = search_movie(query)
    return jsonify({'results': results})


@app.route('/api/tmdb/movie/<doc_id>', methods=['GET'])
def api_tmdb_get_movie_metadata(doc_id: str):
    from .tmdb import get_movie_metadata
    data = get_movie_metadata(doc_id)
    if data is None:
        return jsonify({'error': 'No metadata found'}), 404
    return jsonify(data)


@app.route('/api/tmdb/movie/<doc_id>/link', methods=['POST', 'OPTIONS'])
def api_tmdb_link_movie(doc_id: str):
    if request.method == 'OPTIONS':
        return '', 204
    from .tmdb import fetch_and_store_movie
    body = request.get_json(silent=True) or {}
    tmdb_id = body.get('tmdb_id')
    if not tmdb_id:
        return jsonify({'error': 'tmdb_id is required'}), 400
    data = fetch_and_store_movie(doc_id, int(tmdb_id))
    if data is None:
        return jsonify({'error': 'Failed to fetch TMDB data'}), 502
    return jsonify(data)


@app.route('/api/tmdb/movie/<doc_id>', methods=['DELETE'])
def api_tmdb_delete_movie_metadata(doc_id: str):
    from .tmdb import delete_movie_metadata
    delete_movie_metadata(doc_id)
    return jsonify({'status': 'ok'})


# TV Series routes

@app.route('/api/tmdb/search/tv', methods=['GET'])
def api_tmdb_search_tv():
    from .tmdb import search_tv
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'q parameter is required'}), 400
    results = search_tv(query)
    return jsonify({'results': results})


@app.route('/api/tmdb/series/<doc_id>', methods=['GET'])
def api_tmdb_get_series_metadata(doc_id: str):
    from .tmdb import get_series_metadata
    data = get_series_metadata(doc_id)
    if data is None:
        return jsonify({'error': 'No metadata found'}), 404
    return jsonify(data)


@app.route('/api/tmdb/series/<doc_id>/link', methods=['POST', 'OPTIONS'])
def api_tmdb_link_series(doc_id: str):
    if request.method == 'OPTIONS':
        return '', 204
    from .tmdb import fetch_and_store_series
    body = request.get_json(silent=True) or {}
    tmdb_id = body.get('tmdb_id')
    if not tmdb_id:
        return jsonify({'error': 'tmdb_id is required'}), 400
    data = fetch_and_store_series(doc_id, int(tmdb_id))
    if data is None:
        return jsonify({'error': 'Failed to fetch TMDB data'}), 502
    return jsonify(data)


@app.route('/api/tmdb/series/<doc_id>', methods=['DELETE'])
def api_tmdb_delete_series_metadata(doc_id: str):
    from .tmdb import delete_series_metadata
    delete_series_metadata(doc_id)
    return jsonify({'status': 'ok'})


@app.route('/api/person/<int:person_id>', methods=['GET'])
def api_get_person(person_id: int):
    from .tmdb import get_person
    data = get_person(person_id)
    if data is None:
        return jsonify({'error': 'Failed to fetch person data'}), 502
    return jsonify(data)



# Subtitles routes

@app.route('/api/subtitles/search', methods=['GET'])
def api_subtitles_search():
    from .subtitles import get_imdb_id, get_series_imdb_id, search_subtitles
    tmdb_id_str = request.args.get('tmdb_id', '')
    season_str = request.args.get('season', '')
    episode_str = request.args.get('episode', '')
    if not tmdb_id_str:
        return jsonify({'error': 'tmdb_id is required'}), 400
    try:
        tmdb_id = int(tmdb_id_str)
        season = int(season_str) if season_str else None
        episode = int(episode_str) if episode_str else None
    except ValueError:
        return jsonify({'error': 'tmdb_id, season, and episode must be integers'}), 400
    if season is not None and episode is not None:
        imdb_id = get_series_imdb_id(tmdb_id)
        if not imdb_id:
            return jsonify({'error': 'No IMDb ID found for this series'}), 404
        results = search_subtitles(imdb_id, season=season, episode=episode)
    else:
        imdb_id = get_imdb_id(tmdb_id)
        if not imdb_id:
            return jsonify({'error': 'No IMDb ID found for this movie'}), 404
        results = search_subtitles(imdb_id)
    return jsonify({'results': results})


@app.route('/api/subtitles/movie/<doc_id>', methods=['GET'])
def api_subtitles_get(doc_id: str):
    from .subtitles import get_subtitle
    data = get_subtitle(doc_id)
    if data is None:
        return jsonify({'error': 'No subtitle found'}), 404
    return jsonify(data)


@app.route('/api/subtitles/movie/<doc_id>/link', methods=['POST', 'OPTIONS'])
def api_subtitles_link(doc_id: str):
    if request.method == 'OPTIONS':
        return '', 204
    from .subtitles import fetch_and_store_subtitle, _get_credentials
    body = request.get_json(silent=True) or {}
    file_id = body.get('file_id')
    release = body.get('release', '')
    if not file_id:
        return jsonify({'error': 'file_id is required'}), 400
    username, password = _get_credentials()
    if not username or not password:
        return jsonify({'error': 'OpenSubtitles username and password are required to download subtitles. Configure them in Admin → Configuration → OpenSubtitles'}), 400
    data = fetch_and_store_subtitle(doc_id, int(file_id), release)
    if data is None:
        return jsonify({'error': 'Failed to download subtitle'}), 502
    return jsonify(data)


@app.route('/api/subtitles/movie/<doc_id>', methods=['DELETE'])
def api_subtitles_delete(doc_id: str):
    from .subtitles import delete_subtitle
    delete_subtitle(doc_id)
    return jsonify({'status': 'ok'})


@app.route('/api/subtitles/movie/<doc_id>/vtt', methods=['GET'])
def api_subtitles_get_vtt(doc_id: str):
    from .subtitles import get_subtitle
    data = get_subtitle(doc_id)
    if data is None:
        return jsonify({'error': 'No subtitle found'}), 404
    vtt = data.get('vtt', '')
    if not vtt:
        return jsonify({'error': 'Subtitle has no VTT content'}), 500
    return vtt, 200, {'Content-Type': 'text/vtt'}


@app.route('/api/subtitles/episode/<ep_id>', methods=['GET'])
def api_subtitles_get_episode(ep_id: str):
    from .subtitles import get_episode_subtitle
    data = get_episode_subtitle(ep_id)
    if data is None:
        return jsonify({'error': 'No subtitle found'}), 404
    return jsonify(data)


@app.route('/api/subtitles/episode/<ep_id>/link', methods=['POST', 'OPTIONS'])
def api_subtitles_link_episode(ep_id: str):
    if request.method == 'OPTIONS':
        return '', 204
    from .subtitles import fetch_and_store_episode_subtitle, _get_credentials
    body = request.get_json(silent=True) or {}
    file_id = body.get('file_id')
    release = body.get('release', '')
    if not file_id:
        return jsonify({'error': 'file_id is required'}), 400
    username, password = _get_credentials()
    if not username or not password:
        return jsonify({'error': 'OpenSubtitles username and password are required to download subtitles. Configure them in Admin → Configuration → OpenSubtitles'}), 400
    data = fetch_and_store_episode_subtitle(ep_id, int(file_id), release)
    if data is None:
        return jsonify({'error': 'Failed to download subtitle'}), 502
    return jsonify(data)


@app.route('/api/subtitles/episode/<ep_id>', methods=['DELETE'])
def api_subtitles_delete_episode(ep_id: str):
    from .subtitles import delete_episode_subtitle
    delete_episode_subtitle(ep_id)
    return jsonify({'status': 'ok'})


@app.route('/api/subtitles/episode/<ep_id>/vtt', methods=['GET'])
def api_subtitles_get_episode_vtt(ep_id: str):
    from .subtitles import get_episode_subtitle
    data = get_episode_subtitle(ep_id)
    if data is None:
        return jsonify({'error': 'No subtitle found'}), 404
    vtt = data.get('vtt', '')
    if not vtt:
        return jsonify({'error': 'Subtitle has no VTT content'}), 500
    return vtt, 200, {'Content-Type': 'text/vtt'}


@app.route('/api/connection-status', methods=['GET'])
def api_connection_status():
    xtream_url = os.getenv('XTREAM_SERVER_URL', '')
    xtream_username = os.getenv('XTREAM_USERNAME', '')
    xtream_password = os.getenv('XTREAM_PASSWORD', '')
    if not xtream_url or not xtream_username or not xtream_password:
        return jsonify({'error': 'Xtream credentials not configured'}), 500
    url = f"{xtream_url.rstrip('/')}/player_api.php?username={xtream_username}&password={xtream_password}"
    try:
        resp = http_requests.get(url, timeout=10)
        data = resp.json()
    except Exception as e:
        logger.warning('Failed to fetch xtream connection status: %s', e)
        return jsonify({'error': 'Failed to fetch connection status'}), 502
    user_info = data.get('user_info', {})
    max_connections = int(user_info.get('max_connections', 0))
    active_cons = int(user_info.get('active_cons', 0))
    return jsonify({
        'max_connections': max_connections,
        'active_cons': active_cons,
        'is_full': active_cons >= max_connections,
    })


if __name__ == '__main__':
    from .config_db import seed_defaults

    logger.info("Seeding config store...")
    seed_defaults()
    logger.info("Config store ready")

    port = int(os.getenv('API_PORT', '5555'))
    app.run(host='0.0.0.0', port=port, debug=False)
