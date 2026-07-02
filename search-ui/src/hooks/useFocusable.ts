import { useEffect, useCallback, useRef } from 'react'
import {
  registerNode,
  unregisterNode,
  focusNode,
  type FocusableNode,
} from '../lib/spatial-navigation'

interface UseFocusableOptions {
  id: string
  focusGroup?: string
  onFocus?: () => void
  onBlur?: () => void
  onActivate?: () => void
  autoFocus?: boolean
}

export function useFocusable<T extends HTMLElement = HTMLDivElement>({
  id,
  focusGroup,
  onFocus,
  onBlur,
  onActivate,
  autoFocus,
}: UseFocusableOptions) {
  const nodeRef = useRef<FocusableNode | null>(null)

  const ref = useCallback(
    (el: T | null) => {
      if (!el) {
        // Component unmounting — clean up
        if (nodeRef.current) {
          unregisterNode(nodeRef.current.id)
          nodeRef.current = null
        }
        return
      }

      const node: FocusableNode = {
        id,
        element: el,
        getRect: () => el.getBoundingClientRect(),
        onFocus,
        onBlur,
        onActivate,
        focusGroup,
      }

      if (nodeRef.current) {
        // Re-render: update existing node in-place (preserves activeNodeId)
        nodeRef.current.element = el
        nodeRef.current.getRect = node.getRect
        nodeRef.current.onFocus = onFocus
        nodeRef.current.onBlur = onBlur
        nodeRef.current.onActivate = onActivate
        registerNode(nodeRef.current)
      } else {
        // Initial mount
        nodeRef.current = node
        registerNode(node)
      }

      if (autoFocus) {
        focusNode(id)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, focusGroup, onFocus, onBlur, onActivate, autoFocus]
  )

  const focus = useCallback(() => {
    focusNode(id)
  }, [id])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (nodeRef.current) {
        unregisterNode(nodeRef.current.id)
      }
    }
  }, [])

  return { ref, focus }
}
