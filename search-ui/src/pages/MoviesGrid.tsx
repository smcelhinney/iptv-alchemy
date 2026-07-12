import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchDocument } from '../lib/api'
import type { Hit } from '../types'
import SearchCard from '../components/SearchCard'
import LibraryGridToolbar from '../components/LibraryGridToolbar'
import AddToCollectionModal from '../components/AddToCollectionModal'
import type { MoviesContext } from './MoviesLayout'

export default function MoviesGrid() {
  const { sortedIds, removeFromLib, clearProgress, playbackMemory } = useOutletContext<MoviesContext>()
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showCollectionModal, setShowCollectionModal] = useState(false)

  useEffect(() => {
    if (!isSelecting) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSelecting(false)
        setSelectedIds(new Set())
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isSelecting])

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    const message = count === 1
      ? 'Remove this movie from your library?'
      : `Remove ${count} selected movies from your library?`
    if (!confirm(message)) return
    selectedIds.forEach((id) => removeFromLib.mutate({ type: 'movies', id }))
    setIsSelecting(false)
    setSelectedIds(new Set())
  }

  return (
    <>
      <LibraryGridToolbar
        isSelecting={isSelecting}
        selectedCount={selectedIds.size}
        onStartSelect={() => setIsSelecting(true)}
        onCancel={() => {
          setIsSelecting(false)
          setSelectedIds(new Set())
        }}
        onDelete={handleDelete}
        onAddToCollection={() => setShowCollectionModal(true)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedIds.map((id: string) => {
          const mem = playbackMemory?.[id]
          return (
            <MovieCard
              key={id}
              id={id}
              selectable={isSelecting}
              selected={selectedIds.has(id)}
              onToggleSelect={() => toggleSelection(id)}
              onRemove={() => { removeFromLib.mutate({ type: 'movies', id }) }}
              resumeTime={mem?.currentTime}
              resumeDuration={mem?.duration}
              onClearProgress={mem ? () => { clearProgress.mutate(id) } : undefined}
            />
          )
        })}
      </div>
      {showCollectionModal && (
        <AddToCollectionModal
          docId={Array.from(selectedIds)}
          type="movies"
          onClose={() => {
            setShowCollectionModal(false)
            setIsSelecting(false)
            setSelectedIds(new Set())
          }}
        />
      )}
    </>
  )
}

function MovieCard({ id, selectable, selected, onToggleSelect, onRemove, resumeTime, resumeDuration, onClearProgress }: {
  id: string
  selectable: boolean
  selected: boolean
  onToggleSelect: () => void
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
      <SearchCard
        hit={stubHit}
        onSelect={() => {}}
        to={`/library/movies/${id}`}
        onRemove={onRemove}
        resumeTime={resumeTime}
        resumeDuration={resumeDuration}
        onClearProgress={onClearProgress}
        selectable={selectable}
        selected={selected}
        onToggleSelect={onToggleSelect}
      />
    </div>
  )
}
