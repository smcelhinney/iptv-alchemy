import { useEffect, useRef, useState, useId, useCallback } from 'react'
import mpegts from 'mpegts.js'
import { useSettings } from '../contexts/SettingsContext'

interface StreamPlayerProps {
  url: string
  contentType: 'live' | 'vod'
  favouriteId?: string
  initialTime?: number
  savePlaybackId?: string
  subtitleUrl?: string
}

function timestampToMs(ts: string): number {
  const [h, m, s] = ts.split(':').map(Number)
  return h * 3600000 + m * 60000 + s * 1000
}

function msToTimestamp(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const f = ms % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(f).padStart(3, '0')}`
}

function applyVttOffset(vtt: string, offsetMs: number): string {
  if (offsetMs === 0) return vtt
  return vtt.replace(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/g, (_, start, end) => {
    const newStart = Math.max(0, timestampToMs(start) + offsetMs)
    const newEnd = Math.max(0, timestampToMs(end) + offsetMs)
    return `${msToTimestamp(newStart)} --> ${msToTimestamp(newEnd)}`
  })
}

export default function StreamPlayer({ url, contentType, favouriteId, initialTime, savePlaybackId, subtitleUrl }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<mpegts.Player | null>(null)
  const trackRef = useRef<HTMLTrackElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const [error, setError] = useState(false)
  const [noAudio, setNoAudio] = useState(false)
  const [vttText, setVttText] = useState<string | null>(null)
  const { settings } = useSettings()
  const styleId = useId()

  // Live TV: route through backend transcoding proxy (HEVC/AC3 → H.264/AAC)
  const streamUrl = contentType === 'live'
    ? `${window.location.origin}/api/proxy/live-tv?url=${encodeURIComponent(url)}`
    : url

  const sizeMap: Record<string, string> = {
    small: '80%',
    normal: '100%',
    large: '150%',
  }
  const subtitleFontSize = sizeMap[settings.subtitle_size ?? 'normal'] ?? '100%'

  const cleanupTrack = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    if (trackRef.current) {
      const video = videoRef.current
      if (video?.contains(trackRef.current)) {
        video.removeChild(trackRef.current)
      }
      trackRef.current = null
    }
  }, [])

  // Seek to initialTime on VOD metadata load
  const handleLoadedMetadata = () => {
    if (contentType === 'vod' && initialTime && initialTime > 0 && videoRef.current) {
      videoRef.current.currentTime = initialTime
    }
  }

  // Save playback progress every 5s for VOD (offloaded to Service Worker)
  const saveProgress = useCallback((id: string, currentTime: number, duration: number) => {
    const payload = { type: 'SAVE_PLAYBACK', id, currentTime, duration }
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage(payload)
    } else {
      // Fallback: raw fetch with keepalive (no React Query, no re-renders)
      fetch('/api/playback/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, currentTime, duration }),
        keepalive: true,
      }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const progressId = savePlaybackId || favouriteId
    if (contentType !== 'vod' || !progressId) return

    const interval = setInterval(() => {
      const video = videoRef.current
      if (!video || video.paused || video.ended) return
      const dur = video.duration || 0
      saveProgress(progressId, video.currentTime, dur)
    }, 5000)

    return () => clearInterval(interval)
  }, [contentType, savePlaybackId, favouriteId, saveProgress])

  useEffect(() => {
    setError(false)

    if (contentType === 'vod') {
      // VOD: native HTML5 video element — the parent sets src
      return
    }

    // Live: use mpegts.js for TS streaming
    let mounted = true

    const initPlayer = () => {
      if (!mounted || !videoRef.current) return

      if (!mpegts.isSupported()) {
        setError(true)
        return
      }

      const player = mpegts.createPlayer(
        {
          type: 'mpegts',
          url: streamUrl,
          isLive: true,
          cors: true,
        },
        {
          enableWorker: true,
          enableStashBuffer: true,
          stashInitialSize: 1024 * 1024,  // 1MB initial buffer before playback
          autoCleanupSourceBuffer: true,
          autoCleanupMaxBackwardDuration: 30,
          autoCleanupMinBackwardDuration: 10,
          liveBufferLatencyChasing: true,
          liveBufferLatencyMaxLatency: 15,  // catch up if >15s behind live edge
          liveBufferLatencyMinRemain: 5,    // keep at least 5s when chasing
          liveBufferLatencyChasingOnPaused: false,
        },
      )

      player.on(mpegts.Events.MEDIA_INFO, (info: any) => {
        console.log('[mpegts] audio info:', {
          hasAudio: info.hasAudio,
          audioCodec: info.audioCodec,
          audioChannelCount: info.audioChannelCount,
          audioSampleRate: info.audioSampleRate,
          hasVideo: info.hasVideo,
        })
        if (info.hasAudio && info.audioCodec) {
          const mime = `audio/mp4;codecs=${info.audioCodec}`
          if (!MediaSource.isTypeSupported(mime)) {
            console.warn(`[mpegts] Audio codec ${info.audioCodec} not supported by this browser`)
            setNoAudio(true)
          }
        }
      })

      player.on(mpegts.Events.ERROR, (_errorType: any, _errorDetail: any, errorInfo: any) => {
        console.warn('[mpegts] player error:', errorInfo)
      })

      player.attachMediaElement(videoRef.current)
      player.load()
      player.play()

      playerRef.current = player
    }

    initPlayer()

    return () => {
      mounted = false
      if (playerRef.current) {
        playerRef.current.pause()
        playerRef.current.unload()
        playerRef.current.detachMediaElement()
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [streamUrl, contentType])

  // Fetch raw VTT text when subtitleUrl changes
  useEffect(() => {
    cleanupTrack()
    setVttText(null)

    if (!subtitleUrl) return

    let cancelled = false
    fetch(subtitleUrl)
      .then(r => r.ok ? r.text() : null)
      .then(text => { if (!cancelled) setVttText(text) })
      .catch(() => { if (!cancelled) setVttText(null) })
    return () => { cancelled = true }
  }, [subtitleUrl, cleanupTrack])

  // Apply offset and update track element
  useEffect(() => {
    const video = videoRef.current
    if (!video || !vttText) return

    const offsetMs = parseInt(settings.subtitle_offset ?? '0', 10) || 0
    const adjusted = offsetMs !== 0 ? applyVttOffset(vttText, offsetMs) : vttText

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
    }

    const blob = new Blob([adjusted], { type: 'text/vtt' })
    blobUrlRef.current = URL.createObjectURL(blob)

    if (!trackRef.current) {
      const track = document.createElement('track')
      track.kind = 'subtitles'
      track.label = 'English'
      track.srclang = 'en'
      track.default = true
      video.appendChild(track)
      trackRef.current = track
    }

    trackRef.current.src = blobUrlRef.current
    trackRef.current.track.mode = settings.subtitle_enabled === 'false' ? 'disabled' : 'showing'
  }, [vttText, settings.subtitle_offset, settings.subtitle_enabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanupTrack() }
  }, [cleanupTrack])

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
        <svg className="w-10 h-10 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">Stream unavailable</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <style>{`#${CSS.escape(styleId)}::cue { font-size: ${subtitleFontSize}; }`}</style>
      <video
        id={styleId}
        ref={videoRef}
        className="w-full h-full bg-black"
        controls
        autoPlay
        playsInline
        muted={false}
        src={contentType === 'vod' ? url : undefined}
        onLoadedMetadata={handleLoadedMetadata}
      />
      {noAudio && (
        <div className="absolute bottom-12 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none select-none">
          No audio
        </div>
      )}
    </div>
  )
}
