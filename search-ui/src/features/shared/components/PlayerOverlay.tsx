import { useEffect, useRef, useState } from 'react'
import ReactPlayer from 'react-player'
import { useChromecast } from '../hooks/useChromecast'
import Tooltip from '../../../components/Tooltip'

interface PlayerOverlayProps {
  open: boolean
  onClose: () => void
  url: string
  title?: string
}

export default function PlayerOverlay({ open, onClose, url, title }: PlayerOverlayProps) {
  const [showUrl, setShowUrl] = useState(true)
  const [playerError, setPlayerError] = useState(false)
  const [castingError, setCastingError] = useState<string | null>(null)
  const [supportsAirPlay, setSupportsAirPlay] = useState(false)
  const playerRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { available, connected, deviceName, loading, castMedia, disconnect } = useChromecast()

  // Enter fullscreen on mobile when player opens
  useEffect(() => {
    if (!open || !containerRef.current) return

    const isMobile = window.innerWidth < 768 || window.matchMedia('(max-width: 768px)').matches

    if (isMobile && containerRef.current.requestFullscreen) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.log('Fullscreen request failed:', err)
      })
    }
  }, [open])

  // Exit fullscreen when player closes
  useEffect(() => {
    if (!open && document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.log('Exit fullscreen failed:', err)
      })
    }
  }, [open])

  // Close player when user exits fullscreen via browser UI
  useEffect(() => {
    if (!open) return

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onClose()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [open, onClose])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Reset state when opening with a new URL
  useEffect(() => {
    if (open) {
      setShowUrl(true)
      setPlayerError(false)
    }
  }, [open, url])

  // Auto-hide overlay after 3 seconds
  useEffect(() => {
    if (!open || !showUrl) return
    const timer = setTimeout(() => setShowUrl(false), 3000)
    return () => clearTimeout(timer)
  }, [open, showUrl, url])

  // Check for AirPlay support (Safari only)
  useEffect(() => {
    const video = document.createElement('video')
    setSupportsAirPlay('webkitCurrentPlaybackTargetIsWireless' in video)
  }, [])

  if (!open) return null

  const streamUrl = url.replace(/\.(ts|mkv)$/, '.m3u8')

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="w-[75vw] h-[75vh] bg-black rounded-xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!loading && available && (
          <div className="absolute top-3 right-14 z-10 flex items-center gap-2">
            {connected ? (
              <Tooltip content={`Connected to ${deviceName}. Click to disconnect.`}>
                <button
                  onClick={() => {
                    disconnect()
                    setCastingError(null)
                  }}
                  className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4 4" />
                  </svg>
                </button>
              </Tooltip>
            ) : (
              <Tooltip content="Cast to Chromecast">
                <button
                  onClick={async () => {
                    try {
                      setCastingError(null)
                      await castMedia(streamUrl, title)
                    } catch (error) {
                      setCastingError(error instanceof Error ? error.message : 'Failed to cast')
                      setTimeout(() => setCastingError(null), 5000)
                    }
                  }}
                  className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                </button>
              </Tooltip>
            )}
          </div>
        )}

        {connected && (
          <div className="absolute bottom-3 left-3 z-10 px-3 py-2 rounded-lg bg-blue-600/90 text-white text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
            <span>Casting to {deviceName}</span>
          </div>
        )}

        {supportsAirPlay && !connected && (
          <div className="absolute bottom-3 left-3 z-10 px-3 py-2 rounded-lg bg-gray-700/90 text-white text-xs flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              <rect x="7" y="10" width="10" height="6" rx="1"/>
            </svg>
            <span>AirPlay available</span>
          </div>
        )}

        {castingError && (
          <div className="absolute bottom-3 right-3 z-10 px-3 py-2 rounded-lg bg-red-600/90 text-white text-sm">
            {castingError}
          </div>
        )}
        <div
          className={`absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/70 max-w-[70%] transition-opacity duration-500 ${showUrl ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <span className="text-white text-sm font-medium truncate">{title}</span>
          )}
          <span className="text-gray-400 text-xs truncate select-all">{streamUrl}</span>
          <button
            onClick={() => setShowUrl(false)}
            className="flex-shrink-0 text-gray-400 hover:text-white"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {playerError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-center px-6">
            <svg className="w-10 h-10 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white font-medium mb-1">Stream unavailable</p>
            <p className="text-gray-400 text-sm">This stream could not be loaded.</p>
          </div>
        )}
        <ReactPlayer
          ref={playerRef}
          src={streamUrl}
          playing
          playsInline
          controls
          width="100%"
          height="100%"
          config={{ hls: {} }}
          onError={() => setPlayerError(true)}
          onReady={() => {
            if (playerRef.current) playerRef.current.muted = true
          }}
        />
      </div>
    </div>
  )
}
