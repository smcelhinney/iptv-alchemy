import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { fetchDocument } from '../lib/api'
import type { Hit } from '../types'
import SearchCard from '../components/SearchCard'
import LibraryGridToolbar from '../components/LibraryGridToolbar'
import AddToCollectionModal from '../components/AddToCollectionModal'

export interface ShowsContext {
  sortedIds: string[]
  removeFromLib: (id: string) => void
}

export default function ShowsGrid() {
  const { sortedIds, removeFromLib } = useOutletContext<ShowsContext>()
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
      ? 'Remove this series from your library? All seasons and episodes under it will be removed.'
      : `Remove ${count} selected series from your library? All seasons and episodes under them will be removed.`
    if (!confirm(message)) return
    selectedIds.forEach((id) => removeFromLib(id))
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
        {sortedIds.map((id) => (
          <ShowCard
            key={id}
            id={id}
            selectable={isSelecting}
            selected={selectedIds.has(id)}
            onToggleSelect={() => toggleSelection(id)}
            onRemove={() => { removeFromLib(id) }}
          />
        ))}
      </div>
      {showCollectionModal && (
        <AddToCollectionModal
          docId={Array.from(selectedIds)}
          type="series"
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

function ShowCard({ id, selectable, selected, onToggleSelect, onRemove }: {
  id: string
  selectable: boolean
  selected: boolean
  onToggleSelect: () => void
  onRemove: () => void
}) {
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
      <SearchCard
        hit={stubHit}
        onSelect={() => {}}
        to={`/library/tv-shows/${id}`}
        onRemove={onRemove}
        selectable={selectable}
        selected={selected}
        onToggleSelect={onToggleSelect}
      />
    </div>
  )
}
