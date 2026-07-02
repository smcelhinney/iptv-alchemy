import { useState, useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchDocument } from '../lib/api'
import { useLibrary, useRemoveFromLibrary, useAddedTimes } from '../hooks/useLibrary'
import type { Hit } from '../types'
import SearchCard from '../components/SearchCard'
import { LibrarySidebar, SortSection, SortButton } from './LibraryLayout'

type ShowSort = 'alpha' | 'added'

export default function ShowsPage() {
  const [sort, setSort] = useState<ShowSort>('alpha')
  const { data: library } = useLibrary()
  const ids = library?.series ?? []
  const { data: addedTimes } = useAddedTimes()
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
      if (r.data) map[ids[i]] = r.data.series_name || r.data.name || ids[i]
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
    return <EmptyState message="No TV shows in your library yet." />
  }

  return (
    <>
      <LibrarySidebar>
        <SortSection>
          <SortButton active={sort === 'alpha'} onClick={() => setSort('alpha')} label="Alphabetically" />
          <SortButton active={sort === 'added'} onClick={() => setSort('added')} label="Date Added" />
        </SortSection>
      </LibrarySidebar>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedIds.map((id) => (
              <ShowCard key={id} id={id} onRemove={() => { removeFromLib.mutate({ type: 'series', id }) }} />
            ))}
          </div>
        </div>
      </div>
    </>
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
