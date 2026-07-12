import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { fetchDocument } from '../lib/api'
import type { Hit, SearchCardItem } from '../types'
import SearchCard from '../components/SearchCard'
import LibraryGridToolbar from '../components/LibraryGridToolbar'
import AddToCollectionModal from '../components/AddToCollectionModal'
import { usePlayerStore } from '../stores/playerStore'

export interface TvChannelsContext {
  sortedIds: string[]
  nameMap: Record<string, string>
  removeFromLib: (id: string) => void
}

export default function TvChannelsGrid() {
  const { sortedIds, nameMap, removeFromLib } = useOutletContext<TvChannelsContext>()
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const [searchParams, setSearchParams] = useSearchParams()
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const filter = searchParams.get('search') || ''

  const setFilter = (value: string) => {
    setSearchParams((prev) => {
      if (value) prev.set('search', value)
      else prev.delete('search')
      return prev
    }, { replace: true })
  }

  const filteredIds = useMemo(() => {
    if (!filter) return sortedIds
    const q = filter.toLowerCase()
    return sortedIds.filter((id) => (nameMap[id] ?? id).toLowerCase().includes(q))
  }, [sortedIds, filter, nameMap])

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
      ? 'Remove this channel from your library?'
      : `Remove ${count} selected channels from your library?`
    if (!confirm(message)) return
    selectedIds.forEach((id) => removeFromLib(id))
    setIsSelecting(false)
    setSelectedIds(new Set())
  }

  const handlePlay = (hit: SearchCardItem) => {
    const cHit = hit as Hit
    openPlayer(cHit.url, cHit.name || 'Unknown', 'live')
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
        filter={filter}
        onFilterChange={setFilter}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredIds.map((id) => (
          <ChannelCard
            key={id}
            id={id}
            selectable={isSelecting}
            selected={selectedIds.has(id)}
            onToggleSelect={() => toggleSelection(id)}
            onPlay={handlePlay}
            onRemove={() => { removeFromLib(id) }}
          />
        ))}
      </div>
      {showCollectionModal && (
        <AddToCollectionModal
          docId={Array.from(selectedIds)}
          type="tv_channels"
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

function ChannelCard({ id, selectable, selected, onToggleSelect, onPlay, onRemove }: {
  id: string
  selectable: boolean
  selected: boolean
  onToggleSelect: () => void
  onPlay: (hit: SearchCardItem) => void
  onRemove: () => void
}) {
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
      <SearchCard
        hit={stubHit}
        onSelect={onPlay}
        onRemove={onRemove}
        selectable={selectable}
        selected={selected}
        onToggleSelect={onToggleSelect}
      />
    </div>
  )
}
