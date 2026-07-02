import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchDocument } from '../lib/api'
import type { Hit } from '../types'
import SearchCard from '../components/SearchCard'
import type { MoviesContext } from './MoviesLayout'

export default function MoviesGrid() {
  const { sortedIds, removeFromLib, clearProgress, playbackMemory } = useOutletContext<MoviesContext>()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedIds.map((id: string) => {
        const mem = playbackMemory?.[id]
        return (
          <MovieCard
            key={id}
            id={id}
            onRemove={() => { removeFromLib.mutate({ type: 'movies', id }) }}
            resumeTime={mem?.currentTime}
            resumeDuration={mem?.duration}
            onClearProgress={mem ? () => { clearProgress.mutate(id) } : undefined}
          />
        )
      })}
    </div>
  )
}

function MovieCard({ id, onRemove, resumeTime, resumeDuration, onClearProgress }: {
  id: string
  onRemove: () => void
  resumeTime?: number
  resumeDuration?: number
  onClearProgress?: () => void
}) {
  const { data: doc } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument<Hit>(id),
  })

  const stubHit: Hit = doc || {
    id,
    type: 'movie' as const,
    name: id,
    movie_name: id,
    url: '',
    logo: '',
  }

  return (
    <div className="min-w-0 flex">
      <SearchCard hit={stubHit} onSelect={() => {}} to={`/library/movies/${id}`} onRemove={onRemove} resumeTime={resumeTime} resumeDuration={resumeDuration} onClearProgress={onClearProgress} />
    </div>
  )
}
