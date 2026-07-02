import { useState, useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchDocument } from '../lib/api'
import { useLibrary, useRemoveFromLibrary, useAddedTimes } from '../hooks/useLibrary'
import type { Hit, SearchCardItem } from '../types'
import SearchCard from '../components/SearchCard'
import { usePlayerStore } from '../stores/playerStore'
import { LibrarySidebar, SortSection, SortButton } from './LibraryLayout'

type TvSort = 'alpha' | 'added'

export default function TvChannelsPage() {
  const [sort, setSort] = useState<TvSort>('alpha')
  const { data: library } = useLibrary()
  const ids = library?.tv_channels ?? []
  const { data: addedTimes } = useAddedTimes()
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const removeFromLib = useRemoveFromLibrary()

  type DocResult = { data: Hit | undefined }
  const docResults = useQueries({
    queries: ids.map((id: string) => ({
      queryKey: ['document', id],
      queryFn: () => fetchDocument<Hit>(id),
      staleTime: 60_000,
    })),
  }) as DocResult[]

  const nameMap = useMemo(() => {
    const map: Record<string, string> = {}
    docResults.forEach((r, i) => {
      if (r.data) map[ids[i]] = r.data.name || ids[i]
    })
    return map
  }, [docResults, ids])

  const sortedIds: string[] = useMemo(() => {
    const sorted = [...ids]
    if (sort === 'alpha') {
      sorted.sort((a, b) => (nameMap[a] ?? a).localeCompare(nameMap[b] ?? b))
    } else {
      sorted.sort((a, b) => {
        const ta = parseInt(addedTimes?.[a] ?? '0', 10)
        const tb = parseInt(addedTimes?.[b] ?? '0', 10)
        return tb - ta
      })
    }
    return sorted
  }, [ids, sort, addedTimes, nameMap])

  if (ids.length === 0) {
    return <EmptyState message="No TV channels in your library yet." />
  }

  const handlePlay = (hit: SearchCardItem) => {
    const cHit = hit as Hit
    openPlayer(cHit.url, cHit.name || 'Unknown', 'live')
  }

  return (
    <>
      <LibrarySidebar>
        <SortSection>
          <SortButton active={sort === 'alpha'} onClick={() => setSort('alpha')} label="Alphabetically" />
          <SortButton active={sort === 'added'} onClick={() => setSort('added')} label="Added" />
        </SortSection>
      </LibrarySidebar>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedIds.map((id) => (
              <ChannelCard key={id} id={id} onPlay={handlePlay} onRemove={() => { removeFromLib.mutate({ type: 'tv_channels', id }) }} />
            ))}
          </div>
        </div>
      </div>
    </>
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
      <p className="text-gray-400">{message}</p>
    </div>
  )
}
