import { useRef, useCallback } from 'react'

type BackAction = () => void

const backStack: BackAction[] = []

export function pushBackAction(action: BackAction) {
  backStack.push(action)
}

export function popBackAction() {
  backStack.pop()
}

export function handleBack(): boolean {
  if (backStack.length === 0) return false
  const action = backStack[backStack.length - 1]
  action()
  return true
}

export function useTVBackHandler(action: BackAction | null, enabled = true) {
  const actionRef = useRef(action)
  actionRef.current = action

  const register = useCallback(() => {
    if (!enabled || !actionRef.current) return
    pushBackAction(actionRef.current)
    return () => popBackAction()
  }, [enabled])

  return { register }
}
