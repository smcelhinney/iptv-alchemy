import { useState, useMemo } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { fetchDocument } from '../lib/api'
import { useLibrary, useRemoveFromLibrary, useAddedTimes } from '../hooks/useLibrary'
import { usePlaybackMemory, useDeletePlaybackMemory, useLastPlayed } from '../hooks/usePlaybackMemory'
import type { Hit } from '../types'
import { LibrarySidebar, SortSection, SortButton } from './LibraryLayout'

type MovieSort = 'alpha' | 'added' | 'recent'

export interface MoviesContext {
  sortedIds: string[]
  removeFromLib: ReturnType<typeof useRemoveFromLibrary>
  clearProgress: ReturnType<typeof useDeletePlaybackMemory>
  playbackMemory: Record<string, { currentTime: number; duration: number }> | undefined
}

export default function MoviesLayout() {
  const [sort, setSort] = useState<MovieSort>('alpha')
  const location = useLocation()
  const onCollections = location.pathname.includes('/collections')
  const basePath = '/library/movies'
  const { data: library } = useLibrary()
  const ids = library?.movies ?? []
  const removeFromLib = useRemoveFromLibrary()
  const { data: playbackMemory } = usePlaybackMemory()
  const { data: lastPlayed } = useLastPlayed()
  const { data: addedTimes } = useAddedTimes()
  const clearProgress = useDeletePlaybackMemory()

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
      if (r.data) map[ids[i]] = r.data.movie_name || r.data.name || ids[i]
    })
    return map
  }, [docResults, ids])

  const sortedIds: string[] = useMemo(() => {
    const sorted = [...ids]
    if (sort === 'alpha') {
      sorted.sort((a, b) => (nameMap[a] ?? a).localeCompare(nameMap[b] ?? b))
    } else if (sort === 'added') {
      sorted.sort((a, b) => {
        const ta = parseInt(addedTimes?.[a] ?? '0', 10)
        const tb = parseInt(addedTimes?.[b] ?? '0', 10)
        return tb - ta
      })
    } else {
      sorted.sort((a, b) => {
        const ta = parseInt(lastPlayed?.[a] ?? '0', 10)
        const tb = parseInt(lastPlayed?.[b] ?? '0', 10)
        return tb - ta
      })
    }
    return sorted
  }, [ids, sort, addedTimes, lastPlayed, nameMap])

  if (ids.length === 0) {
    return <EmptyState message="No movies in your library yet." />
  }

  return (
    <>
      <LibrarySidebar>
        <SortSection>
          <SortButton to={basePath} active={!onCollections && sort === 'alpha'} onClick={() => setSort('alpha')} label="Alphabetically" />
          <SortButton to={basePath} active={!onCollections && sort === 'added'} onClick={() => setSort('added')} label="Date Added" />
          <SortButton to={basePath} active={!onCollections && sort === 'recent'} onClick={() => setSort('recent')} label="Recently Played" />
        </SortSection>
        <div className="border-t border-gray-700 my-2" />
        <NavLink
          to="/library/movies/collections"
          className={({ isActive }: { isActive: boolean }) =>
            `w-full text-left px-3 py-2 rounded-lg text-sm transition-colors block ${
              isActive
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`
          }
        >
          Collections
        </NavLink>
      </LibrarySidebar>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet context={{ sortedIds, removeFromLib, clearProgress, playbackMemory } satisfies MoviesContext} />
        </div>
      </div>
    </>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  )
}
