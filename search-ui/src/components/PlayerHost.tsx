import { usePlayerStore } from '../stores/playerStore'
import FloatingPlayer from './FloatingPlayer'
import TVPlayer from './TVPlayer'

export default function PlayerHost() {
  const playerMode = usePlayerStore((s) => s.playerMode)

  if (playerMode === 'fullscreen') {
    return <TVPlayer />
  }

  return <FloatingPlayer />
}
