import { useEffect, useRef, useState, useCallback } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { useMovieSubtitle, useEpisodeSubtitle } from '../hooks/useSubtitles'
import { getSubtitleVttUrl, getEpisodeSubtitleVttUrl } from '../lib/api/subtitle-service'
import StreamPlayer from './StreamPlayer'

interface Layout {
  x: number
  y: number
  w: number
  h: number
}

// Persisted position/size
function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem('floating-player-layout')
    if (raw) {
      const parsed = JSON.parse(raw) as Layout
      return clampToViewport(parsed)
    }
  } catch {}
  return { x: Math.max(0, window.innerWidth - 520), y: window.innerHeight - 340, w: 500, h: 300 }
}

const HEADER_HEIGHT = 36
const SEEK_SECONDS = 10

function clampToViewport(layout: Layout): Layout {
  const cw = window.innerWidth
  const ch = window.innerHeight
  const maxW = cw - 40
  let { x, y, w, h } = layout
  if (w > maxW) w = maxW
  if (x < 0 || x + w > cw) x = 0
  if (y < 0) y = 0
  if (y > ch - HEADER_HEIGHT) y = ch - HEADER_HEIGHT
  return { x, y, w, h }
}

function saveLayout(layout: { x: number; y: number; w: number; h: number }) {
  try {
    localStorage.setItem('floating-player-layout', JSON.stringify(layout))
  } catch {}
}

export default function FloatingPlayer() {
  const { open, url, title, contentType, favouriteId, initialTime, savePlaybackId, closePlayer } = usePlayerStore()
  const subtitleDocId = savePlaybackId || favouriteId
  const { data: movieSubtitleData } = useMovieSubtitle(subtitleDocId ?? '')
  const { data: episodeSubtitleData } = useEpisodeSubtitle(subtitleDocId ?? '')
  const subtitleData = episodeSubtitleData || movieSubtitleData
  const subtitleUrl = subtitleData
    ? (episodeSubtitleData
        ? getEpisodeSubtitleVttUrl(subtitleDocId ?? '')
        : getSubtitleVttUrl(subtitleDocId ?? ''))
    : undefined
  const [layout, setLayout] = useState<Layout>(loadLayout)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // Clamp to viewport when opening (viewports can change between saves)
  useEffect(() => {
    if (!open) return
    setLayout(prev => {
      const next = clampToViewport(prev)
      if (next.x !== prev.x || next.w !== prev.w) {
        saveLayout(next)
        return next
      }
      return prev
    })
  }, [open])

  // Keyboard controls: close on Escape, seek VOD on arrow keys
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          e.preventDefault()
          document.exitFullscreen?.()
        } else {
          closePlayer()
        }
        return
      }

      if (contentType !== 'vod') return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return

      const active = document.activeElement
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active?.getAttribute('contenteditable') === 'true'
      ) {
        return
      }

      const video = videoContainerRef.current?.querySelector('video')
      if (!video || !isFinite(video.duration)) return

      e.preventDefault()
      if (e.key === 'ArrowLeft') {
        video.currentTime = Math.max(0, video.currentTime - SEEK_SECONDS)
      } else {
        video.currentTime = Math.min(video.duration, video.currentTime + SEEK_SECONDS)
      }
    }

    // Use capture phase so native video controls can't swallow the event
    window.addEventListener('keydown', handler, true)

    return () => {
      window.removeEventListener('keydown', handler, true)
    }
  }, [open, closePlayer, contentType])

  // Native video controls trap focus and swallow Escape. Blur the video
  // element after any mouse interaction so focus returns to the page.
  useEffect(() => {
    if (!open) return
    const video = videoContainerRef.current?.querySelector('video')
    if (!video) return

    const onMouseUp = () => {
      // Defer so the browser finishes its own focus handling first.
      requestAnimationFrame(() => {
        if (document.activeElement === video) {
          video.blur()
        }
      })
    }

    video.addEventListener('mouseup', onMouseUp)
    return () => video.removeEventListener('mouseup', onMouseUp)
  }, [open])

  // Drag handlers
  const onDragMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    dragOffset.current = { x: e.clientX - layout.x, y: e.clientY - layout.y }
  }, [layout])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      setLayout(prev => {
        const next = { ...prev, x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }
        saveLayout(next)
        return next
      })
    }
    const onUp = () => {
      setDragging(false)
      setLayout(prev => {
        const next = clampToViewport(prev)
        saveLayout(next)
        return next
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  // Resize handlers
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(true)
    resizeStart.current = { x: e.clientX, y: e.clientY, w: layout.w, h: layout.h }
  }, [layout])

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      setLayout(prev => {
        const next = {
          ...prev,
          w: Math.max(300, resizeStart.current.w + (e.clientX - resizeStart.current.x)),
          h: Math.max(200, resizeStart.current.h + (e.clientY - resizeStart.current.y)),
        }
        saveLayout(next)
        return next
      })
    }
    const onUp = () => setResizing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing])

  if (!open) return null

  return (
    <div
      className="fixed z-[70] flex flex-col bg-gray-900 rounded-lg overflow-hidden shadow-2xl border border-gray-700"
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.w,
        height: layout.h,
      }}
    >
      {/* Header — draggable */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-800 cursor-move select-none flex-shrink-0"
        onMouseDown={onDragMouseDown}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white text-sm font-medium truncate">{title}</span>
          {contentType === 'live' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-semibold uppercase tracking-wide flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button
          onClick={closePlayer}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Video area */}
      <div ref={videoContainerRef} className="flex-1 overflow-hidden relative">
        <StreamPlayer url={url} contentType={contentType} favouriteId={favouriteId} initialTime={initialTime} savePlaybackId={savePlaybackId} subtitleUrl={subtitleUrl} />
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={onResizeMouseDown}
      >
        <svg className="w-4 h-4 text-gray-600" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14 14H10L14 10V14ZM14 14H12L14 12V14Z" />
        </svg>
      </div>
    </div>
  )
}
