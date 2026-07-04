import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { fetchDocument } from '../lib/api'
import type { Hit, SearchCardItem } from '../types'
import SearchCard from '../components/SearchCard'
import { usePlayerStore } from '../stores/playerStore'

export interface TvChannelsContext {
  sortedIds: string[]
  removeFromLib: (id: string) => void
}

export default function TvChannelsGrid() {
  const { sortedIds, removeFromLib } = useOutletContext<TvChannelsContext>()
  const openPlayer = usePlayerStore((s) => s.openPlayer)

  const handlePlay = (hit: SearchCardItem) => {
    const cHit = hit as Hit
    openPlayer(cHit.url, cHit.name || 'Unknown', 'live')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedIds.map((id) => (
        <ChannelCard
          key={id}
          id={id}
          onPlay={handlePlay}
          onRemove={() => { removeFromLib(id) }}
        />
      ))}
    </div>
  )
}

function ChannelCard({ id, onPlay, onRemove }: { id: string; onPlay: (hit: SearchCardItem) => void; onRemove: () => void }) {
  const { data: doc } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument<Hit>(id),
  })

  const stubHit: Hit = doc || {
    id,
    type: 'live_tv' as const,
    name: id,
    url: '',
    logo: '',
  }

  return (
    <div className="min-w-0 flex">
      <SearchCard hit={stubHit} onSelect={onPlay} onRemove={onRemove} />
    </div>
  )
}
