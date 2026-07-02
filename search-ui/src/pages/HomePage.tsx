import { useState, useMemo } from 'react'
import { useParams, Navigate, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchDocument } from '../lib/api'
import { useLibrary, useRemoveFromLibrary, useAddedTimes } from '../hooks/useLibrary'
import { usePlaybackMemory, useDeletePlaybackMemory, useLastPlayed } from '../hooks/usePlaybackMemory'
import type { Hit, SearchCardItem } from '../types'
import SearchCard from '../components/SearchCard'
import { usePlayerStore } from '../stores/playerStore'

type LibraryTab = 'tv-channels' | 'movies' | 'tv-shows'

export default function HomePage() {
  const { tab } = useParams<{ tab: LibraryTab }>()

  const validTabs: LibraryTab[] = ['tv-channels', 'movies', 'tv-shows']
  if (!tab || !validTabs.includes(tab as LibraryTab)) {
    return <Navigate to="/library/tv-channels" replace />
  }

  const activeTab = tab as LibraryTab

  const { data: library, isLoading: libLoading } = useLibrary()

  const movieIds = library?.movies ?? []
  const seriesIds = library?.series ?? []
  const tvChannelIds = library?.tv_channels ?? []

  const hasContent = movieIds.length > 0 || seriesIds.length > 0 || tvChannelIds.length > 0

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Tab bar */}
      <div className="flex gap-6 border-b border-gray-700 mb-6">
        <NavLink
          to="/library/tv-channels"
          className={({ isActive }) =>
            `pb-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-200'
            }`
          }
        >
          TV Channels ({tvChannelIds.length})
        </NavLink>
        <NavLink
          to="/library/movies"
          className={({ isActive }) =>
            `pb-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-200'
            }`
          }
        >
          Movies ({movieIds.length})
        </NavLink>
        <NavLink
          to="/library/tv-shows"
          className={({ isActive }) =>
            `pb-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-200'
            }`
          }
        >
          TV Shows ({seriesIds.length})
        </NavLink>
      </div>

      {libLoading && (
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading library...
        </div>
      )}

      {!libLoading && !hasContent && (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-400 mb-1">Nothing in your library yet</h3>
          <p className="text-sm text-gray-500">
            Search for TV shows, movies, and channels to add them to your library.
          </p>
        </div>
      )}

      {!libLoading && hasContent && (
        <>
          {activeTab === 'tv-channels' && <TvChannelsSection ids={tvChannelIds} />}
          {activeTab === 'movies' && <MoviesSection ids={movieIds} />}
          {activeTab === 'tv-shows' && <ShowsSection ids={seriesIds} />}

          {((activeTab === 'tv-channels' && tvChannelIds.length === 0) ||
            (activeTab === 'movies' && movieIds.length === 0) ||
            (activeTab === 'tv-shows' && seriesIds.length === 0)) && (
            <div className="text-center py-16">
              <p className="text-gray-400">
                {activeTab === 'tv-channels' ? 'No TV channels in your library yet.' :
                 activeTab === 'movies' ? 'No movies in your library yet.' :
                 'No TV shows in your library yet.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TvChannelsSection({ ids }: { ids: string[] }) {
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const removeFromLib = useRemoveFromLibrary()

  const handlePlay = (hit: SearchCardItem) => {
    const cHit = hit as Hit
    openPlayer(cHit.url, cHit.name || 'Unknown', 'live')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {ids.map((id) => (
        <ChannelCard key={id} id={id} onPlay={handlePlay} onRemove={() => removeFromLib.mutate({ type: 'tv_channels', id })} />
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

function MoviesSection({ ids }: { ids: string[] }) {
  const [sortBy, setSortBy] = useState<'added' | 'recent'>('added')
  const removeFromLib = useRemoveFromLibrary()
  const { data: playbackMemory } = usePlaybackMemory()
  const { data: lastPlayed } = useLastPlayed()
  const { data: addedTimes } = useAddedTimes()
  const clearProgress = useDeletePlaybackMemory()

  const sortedIds = useMemo(() => {
    const sorted = [...ids]
    if (sortBy === 'added') {
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
  }, [ids, sortBy, addedTimes, lastPlayed])

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <label className="text-xs text-gray-400 mr-2">Sort by</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'added' | 'recent')}
          className="bg-gray-800 text-sm text-gray-200 rounded px-2 py-1 border border-gray-700 focus:outline-none focus:border-blue-500"
        >
          <option value="added">Date Added</option>
          <option value="recent">Recently Played</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedIds.map((id) => {
          const mem = playbackMemory?.[id]
          return (
            <MovieCard
              key={id}
              id={id}
              onRemove={() => removeFromLib.mutate({ type: 'movies', id })}
              resumeTime={mem?.currentTime}
              resumeDuration={mem?.duration}
              onClearProgress={mem ? () => clearProgress.mutate(id) : undefined}
            />
          )
        })}
      </div>
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

function ShowsSection({ ids }: { ids: string[] }) {
  const removeFromLib = useRemoveFromLibrary()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {ids.map((id) => (
        <ShowCard key={id} id={id} onRemove={() => removeFromLib.mutate({ type: 'series', id })} />
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
