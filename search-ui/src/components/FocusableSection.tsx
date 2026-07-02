import { isTV } from '../lib/device'
import { useFocusable } from '../hooks/useFocusable'
import { moveFocus } from '../lib/spatial-navigation'

interface FocusableSectionProps {
  id: string
  focusGroup?: string
  className?: string
  children: React.ReactNode
}

/**
 * Wraps a page section as a focusable container for spatial navigation.
 *
 * When the container receives focus, it immediately delegates to the first
 * child below it (via moveFocus). This lets users navigate Right from the
 * sidebar filters into the search results area, landing directly on a card.
 *
 * If no children exist yet (async loading), the container stays focused
 * until children appear and the user presses Down.
 */
export default function FocusableSection({
  id,
  focusGroup = 'content',
  className,
  children,
}: FocusableSectionProps) {
  const tvMode = isTV()
  const { ref } = useFocusable<HTMLDivElement>({
    id,
    focusGroup,
    onFocus: () => {
      // Delegate to first child below the container
      moveFocus('down')
    },
  })

  if (!tvMode) return <>{children}</>

  return (
    <div ref={ref} className={`tv-section ${className ?? ''}`} tabIndex={-1}>
      {children}
    </div>
  )
}
