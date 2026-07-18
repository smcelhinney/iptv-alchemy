import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const offset = 6
    let top = 0
    let left = 0

    switch (position) {
      case 'top':
        top = rect.top - offset
        left = rect.left + rect.width / 2
        break
      case 'bottom':
        top = rect.bottom + offset
        left = rect.left + rect.width / 2
        break
      case 'left':
        top = rect.top + rect.height / 2
        left = rect.left - offset
        break
      case 'right':
        top = rect.top + rect.height / 2
        left = rect.right + offset
        break
    }

    setCoords({ top, left })
  }, [position])

  useEffect(() => {
    if (!visible) return
    updateCoords()
    const handleScroll = () => updateCoords()
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', updateCoords)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', updateCoords)
    }
  }, [visible, updateCoords])

  const show = () => {
    updateCoords()
    timerRef.current = setTimeout(() => setVisible(true), delay)
  }

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }

  const transform = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  }[position]

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-700 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-700 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-700 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-700 border-y-transparent border-l-transparent',
  }

  if (typeof document === 'undefined') {
    return (
      <div
        className="relative"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>
    )
  }

  return (
    <>
      <div
        ref={triggerRef}
        className="relative"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>
      {visible &&
        createPortal(
          <div
            className="fixed z-[100] pointer-events-none"
            style={{ top: coords.top, left: coords.left, transform }}
          >
            <div className="bg-gray-700 text-white text-xs px-2 py-1 rounded shadow-lg w-max max-w-[200px]">
              {content}
            </div>
            <div
              className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
            />
          </div>,
          document.body
        )}
    </>
  )
}
