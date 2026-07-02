export interface FocusableNode {
  id: string
  element: HTMLElement
  getRect: () => DOMRect
  onFocus?: () => void
  onBlur?: () => void
  onActivate?: () => void
  focusGroup?: string // for row containment
}

type Direction = 'up' | 'down' | 'left' | 'right'

const nodes = new Map<string, FocusableNode>()
let activeNodeId: string | null = null
let focusTrapIds: Set<string> | null = null

export function registerNode(node: FocusableNode) {
  nodes.set(node.id, node)
}

export function unregisterNode(id: string) {
  nodes.delete(id)
  if (activeNodeId === id) activeNodeId = null
}

export function setFocusTrap(nodeIds: Set<string> | null) {
  focusTrapIds = nodeIds
}

export function getActiveNodeId(): string | null {
  return activeNodeId
}

export function focusNode(id: string) {
  const node = nodes.get(id)
  if (!node) return

  // Blur previous
  if (activeNodeId) {
    const prev = nodes.get(activeNodeId)
    prev?.onBlur?.()
    prev?.element.classList.remove('tv-focused')
  }

  activeNodeId = id
  node.element.classList.add('tv-focused')
  node.element.focus({ preventScroll: true })
  node.onFocus?.()
  node.element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}

export function moveFocus(direction: Direction): boolean {
  const currentNode = activeNodeId ? nodes.get(activeNodeId) : null

  const candidates = getAvailableNodes()
  if (candidates.length === 0) return false

  if (!currentNode) {
    // Focus the first available node
    focusNode(candidates[0].id)
    return true
  }

  const currentRect = currentNode.getRect()
  const currentCx = currentRect.left + currentRect.width / 2
  const currentCy = currentRect.top + currentRect.height / 2

  let best: FocusableNode | null = null
  let bestScore = Infinity

  for (const candidate of candidates) {
    if (candidate.id === currentNode.id) continue

    const rect = candidate.getRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const dx = cx - currentCx
    const dy = cy - currentCy

    // Check if candidate is in the right direction
    if (!isInDirection(direction, dx, dy)) continue

    // Prefer staying in same focus group for left/right
    const sameGroup =
      currentNode.focusGroup && candidate.focusGroup === currentNode.focusGroup
    const groupBonus = sameGroup && (direction === 'left' || direction === 'right') ? 0.4 : 1.0

    const distance = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.abs(
      direction === 'left' || direction === 'right'
        ? Math.atan2(Math.abs(dy), Math.abs(dx))
        : Math.atan2(Math.abs(dx), Math.abs(dy))
    )

    // Weighted score: distance * angle penalty * group factor
    const score = distance * (1 + angle * 2) * groupBonus

    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }

  if (best) {
    focusNode(best.id)
    return true
  }

  return false
}

export function activateCurrent(): boolean {
  if (!activeNodeId) return false
  const node = nodes.get(activeNodeId)
  node?.onActivate?.()
  return !!node?.onActivate
}

function isInDirection(direction: Direction, dx: number, dy: number): boolean {
  switch (direction) {
    case 'up':
      return dy < 0
    case 'down':
      return dy > 0
    case 'left':
      return dx < 0
    case 'right':
      return dx > 0
  }
}

function getAvailableNodes(): FocusableNode[] {
  if (focusTrapIds) {
    return [...nodes.values()].filter((n) => focusTrapIds!.has(n.id))
  }
  return [...nodes.values()].filter((n) => {
    // Skip invisible/offscreen elements
    const rect = n.getRect()
    return rect.width > 0 && rect.height > 0
  })
}
