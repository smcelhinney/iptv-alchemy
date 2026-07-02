import { useEffect, useRef, useState, useCallback } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import StreamPlayer from './StreamPlayer'

export default function TVPlayer() {
  const { open, url, title, contentType, favouriteId, initialTime, savePlaybackId, closePlayer } = usePlayerStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Auto-hide controls after 5s
  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 5000)
  }, [])

  // Request fullscreen on mount
  useEffect(() => {
    if (!open) return
    const el = containerRef.current
    if (!el) return

    const tryFullscreen = () => {
      if (!document.fullscreenElement) {
        el.requestFullscreen?.().catch(() => {})
      }
    }
    // Small delay to ensure element is mounted
    const t = setTimeout(tryFullscreen, 100)
    return () => clearTimeout(t)
  }, [open])

  // Show controls initially
  useEffect(() => {
    if (open) showControls()
  }, [open, showControls])

  // D-pad keyboard controls
  useEffect(() => {
    if (!open) return

    const videoEl = containerRef.current?.querySelector('video')

    const handler = (e: KeyboardEvent) => {
      showControls()

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          if (videoEl) videoEl.currentTime = Math.max(0, videoEl.currentTime - 10)
          break
        case 'ArrowRight':
          e.preventDefault()
          if (videoEl) videoEl.currentTime = videoEl.currentTime + 10
          break
        case 'ArrowUp':
          e.preventDefault()
          if (videoEl) videoEl.volume = Math.min(1, videoEl.volume + 0.1)
          break
        case 'ArrowDown':
          e.preventDefault()
          if (videoEl) videoEl.volume = Math.max(0, videoEl.volume - 0.1)
          break
        case 'Enter':
        case ' ': {
          e.preventDefault()
          if (videoEl) {
            if (videoEl.paused) videoEl.play()
            else videoEl.pause()
          }
          break
        }
        case 'Escape':
        case 'Backspace':
          e.preventDefault()
          if (document.fullscreenElement) {
            document.exitFullscreen()
          }
          closePlayer()
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, closePlayer, showControls])

  if (!open) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onMouseMove={showControls}
      onClick={showControls}
    >
      {/* Video fills entire viewport */}
      <div className="absolute inset-0">
        <StreamPlayer url={url} contentType={contentType} favouriteId={favouriteId} initialTime={initialTime} savePlaybackId={savePlaybackId} />
      </div>

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.8) 100%)',
        }}
      >
        {/* Title bar */}
        <div className="absolute top-0 left-0 right-0 px-8 py-6 bg-gradient-to-b from-black/60 to-transparent">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>

        {/* Bottom controls */}
        <div className="px-8 pb-8 pt-16">
          <div className="flex items-center gap-6">
            <button
              onClick={(e) => {
                e.stopPropagation()
                const videoEl = containerRef.current?.querySelector('video')
                if (videoEl) {
                  if (videoEl.paused) videoEl.play()
                  else videoEl.pause()
                }
              }}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <PlayPauseIcon />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (document.fullscreenElement) document.exitFullscreen()
                closePlayer()
              }}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayPauseIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7zM16 5.14v14h3V5.14h-3z" />
    </svg>
  )
}
