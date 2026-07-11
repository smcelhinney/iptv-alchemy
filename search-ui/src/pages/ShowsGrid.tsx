import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { fetchDocument } from '../lib/api'
import type { Hit } from '../types'
import SearchCard from '../components/SearchCard'

export interface ShowsContext {
  sortedIds: string[]
  removeFromLib: (id: string) => void
}

export default function ShowsGrid() {
  const { sortedIds, removeFromLib } = useOutletContext<ShowsContext>()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedIds.map((id) => (
        <ShowCard key={id} id={id} onRemove={() => { removeFromLib(id) }} />
      ))}
    </div>
  )
}

function ShowCard({ id, onRemove }: { id: string; onRemove: () => void }) {
  const { data: doc } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument<Hit>(id),
  })

  const stubHit: Hit = doc || {
    id,
    type: 'series' as const,
    name: id,
    series_name: id,
    url: '',
    logo: '',
  }

  return (
    <div className="min-w-0 flex">
      <SearchCard hit={stubHit} onSelect={() => {}} to={`/library/tv-shows/${id}`} onRemove={onRemove} />
    </div>
  )
}
