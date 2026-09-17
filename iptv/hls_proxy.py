"""HLS transcoding proxy for live TV streams.

Emby-style HLS packaging: the backend runs ffmpeg with the HLS muxer,
producing a rolling window of .ts segments and a live.m3u8 playlist.
The frontend plays the resulting master.m3u8 with hls.js.

Sessions are kept in memory and expire after a period of inactivity or a
maximum age. A background thread reaps stale sessions.
"""

import logging
import shutil
import subprocess
import threading
import time
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------
HLS_BASE_DIR = Path('/tmp/hls_sessions')
HLS_SEGMENT_DURATION = 2  # seconds per segment
HLS_LIST_SIZE = 6  # segments in the live playlist
HLS_INACTIVITY_TIMEOUT = 120  # seconds before an idle session is reaped
HLS_MAX_SESSION_AGE = 14400  # 4 hours hard cap
HLS_CLEANUP_INTERVAL = 30  # seconds between cleanup sweeps
HLS_PLAYLIST_READY_TIMEOUT = 20  # seconds to wait for ffmpeg to emit live.m3u8

# ---------------------------------------------------------------------------
# Session store
# ---------------------------------------------------------------------------
_sessions: dict[str, 'HlsSession'] = {}
_sessions_lock = threading.Lock()


def _cleanup_expired_sessions() -> None:
    """Stop and remove sessions that have timed out or exceeded max age."""
    now = time.time()
    expired: list[tuple[str, 'HlsSession']] = []
    with _sessions_lock:
        for sid, session in list(_sessions.items()):
            inactive = now - session.last_accessed_at
            age = now - session.created_at
            if inactive > HLS_INACTIVITY_TIMEOUT or age > HLS_MAX_SESSION_AGE:
                expired.append((sid, session))
                del _sessions[sid]
    for sid, session in expired:
        logger.info('hls session expired: %s (inactive=%.0fs, age=%.0fs)', sid,
                    now - session.last_accessed_at, now - session.created_at)
        session.stop()


def _cleanup_all_sessions() -> None:
    """Stop every active session. Used on shutdown/reload."""
    with _sessions_lock:
        sessions = list(_sessions.values())
        _sessions.clear()
    for session in sessions:
        session.stop()


def _start_cleanup_thread() -> None:
    """Start a daemon thread that reaps expired HLS sessions."""
    def loop() -> None:
        while True:
            time.sleep(HLS_CLEANUP_INTERVAL)
            try:
                _cleanup_expired_sessions()
            except Exception:
                logger.exception('hls session cleanup failed')

    t = threading.Thread(target=loop, daemon=True)
    t.start()


# Start the reaper when this module is imported.
_start_cleanup_thread()

# Clean up any orphaned session directories from a previous process lifetime.
try:
    if HLS_BASE_DIR.exists():
        for child in HLS_BASE_DIR.iterdir():
            try:
                if child.is_dir():
                    shutil.rmtree(child, ignore_errors=True)
                else:
                    child.unlink()
            except Exception:
                pass
except Exception:
    pass


# ---------------------------------------------------------------------------
# Session model
# ---------------------------------------------------------------------------
class HlsSession:
    """Manages one ffmpeg -> HLS transcode session."""

    def __init__(self, source_url: str, session_id: str | None = None) -> None:
        self.session_id = session_id or uuid.uuid4().hex[:16]
        self.source_url = source_url
        self.created_at = time.time()
        self.last_accessed_at = self.created_at
        self.temp_dir = HLS_BASE_DIR / self.session_id
        self.proc: subprocess.Popen | None = None
        self.error: str | None = None
        self._stopped = False
        self.ready = threading.Event()

    def touch(self) -> None:
        """Mark the session as recently used."""
        self.last_accessed_at = time.time()

    def start(self) -> None:
        """Create the temp directory, write the master playlist, and start ffmpeg."""
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self._write_master_playlist()
        self._start_ffmpeg()

    def _write_master_playlist(self) -> None:
        """Write a static master playlist pointing at the live media playlist."""
        master_path = self.temp_dir / 'master.m3u8'
        # Resolution matches the -vf scale=1280:-2 target in _ffmpeg_args.
        master_path.write_text(
            '#EXTM3U\n'
            '#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1280x720,'
            'CODECS="avc1.640028,mp4a.40.2"\n'
            'live.m3u8\n',
            encoding='utf-8',
        )

    def _ffmpeg_args(self) -> list[str]:
        """Build the ffmpeg command for HLS live transcoding."""
        segment_path = self.temp_dir / 'seg_%03d.ts'
        return [
            'ffmpeg',
            '-hide_banner',
            '-loglevel', 'warning',
            '-user_agent', 'VLC/3.0.21 LibVLC/3.0.21',
            '-fflags', '+discardcorrupt+igndts',
            '-i', self.source_url,
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-tune', 'zerolatency',
            '-profile:v', 'high',
            '-pix_fmt', 'yuv420p',
            '-crf', '20',
            '-maxrate', '5000k',
            '-bufsize', '10000k',
            '-r', '30',
            '-g', '60',  # 2-second GOP at 30fps
            '-vf', 'scale=1280:-2',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ac', '2',
            '-f', 'hls',
            '-hls_time', str(HLS_SEGMENT_DURATION),
            '-hls_list_size', str(HLS_LIST_SIZE),
            '-hls_flags', 'delete_segments+omit_endlist',
            '-hls_segment_filename', str(segment_path),
            str(self.temp_dir / 'live.m3u8'),
        ]

    def _start_ffmpeg(self) -> None:
        """Launch ffmpeg and wait for the live playlist in a background thread."""
        try:
            self.proc = subprocess.Popen(
                self._ffmpeg_args(),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                cwd=str(self.temp_dir),
            )
        except FileNotFoundError:
            self.error = 'ffmpeg not installed on server'
            self.ready.set()
            return
        except Exception as e:
            logger.exception('failed to start ffmpeg hls session %s', self.session_id)
            self.error = f'failed to start ffmpeg: {e}'
            self.ready.set()
            return

        logger.info('hls session %s started ffmpeg for %s', self.session_id, self.source_url)
        threading.Thread(target=self._wait_for_playlist, daemon=True).start()

    def _wait_for_playlist(self) -> None:
        """Wait until ffmpeg has produced a non-empty live.m3u8."""
        live_path = self.temp_dir / 'live.m3u8'
        deadline = time.time() + HLS_PLAYLIST_READY_TIMEOUT
        while time.time() < deadline and not self._stopped:
            try:
                if live_path.exists() and live_path.stat().st_size > 0:
                    logger.info('hls session %s playlist ready', self.session_id)
                    self.ready.set()
                    return
            except OSError:
                pass
            time.sleep(0.5)

        if not self._stopped:
            stderr = ''
            if self.proc and self.proc.stderr:
                try:
                    stderr = self.proc.stderr.read1(4096).decode('utf-8', errors='replace')
                except Exception:
                    pass
            logger.error('hls session %s failed to produce playlist: %s', self.session_id, stderr)
            self.error = 'ffmpeg failed to produce playlist in time'
            self.ready.set()

    def stop(self) -> None:
        """Terminate ffmpeg and delete the session directory."""
        self._stopped = True
        proc = self.proc
        self.proc = None
        if proc:
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                logger.warning('hls session %s ffmpeg did not terminate, killing', self.session_id)
                proc.kill()
                proc.wait(timeout=5)
            except Exception:
                logger.exception('error stopping ffmpeg for session %s', self.session_id)
        try:
            shutil.rmtree(self.temp_dir, ignore_errors=True)
        except Exception:
            logger.exception('error removing hls temp dir %s', self.temp_dir)
        logger.info('hls session %s stopped', self.session_id)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def create_session(source_url: str) -> HlsSession:
    """Create and start a new HLS transcode session."""
    session = HlsSession(source_url)
    with _sessions_lock:
        _sessions[session.session_id] = session
    session.start()
    return session


def get_session(session_id: str) -> HlsSession | None:
    """Return an active session by ID, or None if it no longer exists."""
    with _sessions_lock:
        session = _sessions.get(session_id)
    if session:
        session.touch()
    return session


def stop_session(session_id: str) -> bool:
    """Stop a session and remove it from the store. Returns True if found."""
    with _sessions_lock:
        session = _sessions.pop(session_id, None)
    if session:
        session.stop()
        return True
    return False


def get_session_count() -> int:
    """Return the number of active sessions (useful for metrics)."""
    with _sessions_lock:
        return len(_sessions)
