import { useEffect } from 'react'
import { isTV } from '../lib/device'
import { moveFocus, activateCurrent } from '../lib/spatial-navigation'
import { handleBack } from '../hooks/useTVBackHandler'

export default function TVKeyHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const tvMode = isTV()
    console.log('[TVKeyHandler] mounted, isTV:', tvMode)
    if (!tvMode) return

    const handler = (e: KeyboardEvent) => {
      console.log('[TVKeyHandler] keydown:', e.key, 'target:', (e.target as HTMLElement).tagName, (e.target as HTMLElement).id)

      // Synthetic events dispatched on window — e.target is always 'window'.
      // Check document.activeElement to handle inputs.
      const activeEl = document.activeElement
      if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          ;(activeEl as HTMLElement).blur()
          return
        }
        if (e.key.startsWith('Arrow')) {
          ;(activeEl as HTMLElement).blur()
          // fall through to spatial navigation
        }
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          console.log('[TVKeyHandler] moveFocus up')
          moveFocus('up')
          break
        case 'ArrowDown':
          e.preventDefault()
          console.log('[TVKeyHandler] moveFocus down')
          moveFocus('down')
          break
        case 'ArrowLeft':
          e.preventDefault()
          console.log('[TVKeyHandler] moveFocus left')
          moveFocus('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          console.log('[TVKeyHandler] moveFocus right')
          moveFocus('right')
          break
        case 'Enter':
          e.preventDefault()
          console.log('[TVKeyHandler] activateCurrent')
          activateCurrent()
          break
        case 'Escape':
        case 'Backspace':
          e.preventDefault()
          console.log('[TVKeyHandler] handleBack')
          if (!handleBack()) {
            // No back handler registered — do nothing
          }
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      console.log('[TVKeyHandler] unmount, removing listener')
      window.removeEventListener('keydown', handler)
    }
  }, [])

  return <>{children}</>
}
