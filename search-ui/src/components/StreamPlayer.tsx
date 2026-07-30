import { useEffect, useRef, useState, useId, useCallback } from 'react'
import Hls from 'hls.js'
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
  const mpegtsRef = useRef<mpegts.Player | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const trackRef = useRef<HTMLTrackElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const [error, setError] = useState(false)
  const [noAudio, setNoAudio] = useState(false)
  const [vttText, setVttText] = useState<string | null>(null)
  const { settings } = useSettings()
  const styleId = useId()

  // VOD: route through the unified backend proxy for HTTPS termination
  const vodStreamUrl = contentType === 'vod'
    ? `${window.location.origin}/api/proxy/stream?url=${encodeURIComponent(url)}`
    : undefined

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

  // Live playback: backend HLS transcode + hls.js (Emby-style)
  useEffect(() => {
    setError(false)

    if (contentType === 'vod') {
      // VOD: native HTML5 video element — the parent sets src
      return
    }

    const stopSession = () => {
      const sid = sessionIdRef.current
      sessionIdRef.current = null
      if (sid) {
        fetch(`${window.location.origin}/api/proxy/hls/${sid}/stop`, {
          method: 'POST',
          keepalive: true,
        }).catch(() => {})
      }
    }

    // Last-resort fallback to mpegts.js for very old browsers
    if (!Hls.isSupported()) {
      if (!mpegts.isSupported()) {
        setError(true)
        return
      }

      if (!videoRef.current) return

      const player = mpegts.createPlayer(
        {
          type: 'mpegts',
          url: `${window.location.origin}/api/proxy/stream?url=${encodeURIComponent(url)}`,
          isLive: true,
          cors: true,
        },
        {
          enableWorker: true,
          enableStashBuffer: true,
          stashInitialSize: 1024 * 1024,
          autoCleanupSourceBuffer: true,
          autoCleanupMaxBackwardDuration: 30,
          autoCleanupMinBackwardDuration: 10,
          // Disable aggressive live-edge chasing to avoid skipping
          liveBufferLatencyChasing: false,
        },
      )

      player.on(mpegts.Events.MEDIA_INFO, (info: any) => {
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

      mpegtsRef.current = player

      return () => {
        if (mpegtsRef.current) {
          mpegtsRef.current.pause()
          mpegtsRef.current.unload()
          mpegtsRef.current.detachMediaElement()
          mpegtsRef.current.destroy()
          mpegtsRef.current = null
        }
      }
    }

    let cancelled = false
    let hls: Hls | null = null

    const startHlsSession = async () => {
      try {
        const resp = await fetch(`${window.location.origin}/api/proxy/hls/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        const data = await resp.json()
        if (!resp.ok || data.error) {
          throw new Error(data.error || `HLS start failed: ${resp.status}`)
        }
        if (cancelled) {
          stopSession()
          return
        }

        sessionIdRef.current = data.session_id
        const masterUrl = `${window.location.origin}${data.master_url}`

        if (!videoRef.current) return

        hls = new Hls({
          debug: false,
          testBandwidth: false,
          emeEnabled: false,
          maxMaxBufferLength: 120,
          manifestLoadingTimeOut: 20000,
        })
        hlsRef.current = hls

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error('[hls] fatal error', data)
            setError(true)
          } else {
            console.warn('[hls] non-fatal error', data)
          }
        })

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls?.loadSource(masterUrl)
        })

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(() => {})
        })

        hls.attachMedia(videoRef.current)
      } catch (e) {
        console.error('[hls] failed to start session', e)
        if (!cancelled) setError(true)
      }
    }

    startHlsSession()

    return () => {
      cancelled = true
      hlsRef.current?.destroy()
      hlsRef.current = null
      stopSession()
    }
  }, [url, contentType])

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
        src={vodStreamUrl}
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
