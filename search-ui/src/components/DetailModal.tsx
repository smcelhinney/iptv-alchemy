import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Hit, Episode, SearchCardItem } from '../types'
import type { ListingHit } from '../types/listings'
import { fetchDocument } from '../lib/api'
import { searchClient } from '../lib/api/client'
import { addToLibrary } from '../lib/api'
import { isOnNow, isListingHit } from '../features/shared/utils'
import { pushBackAction, popBackAction } from '../hooks/useTVBackHandler'
import { isTV } from '../lib/device'
import { proxyImageUrl } from '../lib/proxy'
import { useLibraryIds, useAddToLibrary, useRemoveFromLibrary } from '../hooks/useLibrary'
import { usePlayerStore } from '../stores/playerStore'
import Tooltip from './Tooltip'

interface PopularItem {
  tmdb_id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  release_date: string
  year: number | null
  type: 'movie' | 'tv'
}

interface DetailModalProps {
  hit: SearchCardItem | null
  popularItem: PopularItem | null
  onClose: () => void
}

interface SeriesDoc {
  id: string
  name: string
  series_name: string
  category: string
  logo: string
  type: 'series'
  episode_count: number
  episodes: Episode[]
}

interface MovieDoc {
  id: string
  name: string
  movie_name: string
  category: string
  logo: string
  url: string
  type: 'movie'
}

type ContentDoc = SeriesDoc | MovieDoc

function groupBySeason(episodes: Episode[]): { seasons: Record<number, Episode[]>; totalDedupedEpisodes: number } {
  const grouped: Record<number, Episode[]> = {}
  const seen = new Set<string>()
  for (const ep of episodes) {
    const s = ep.season ?? 0
    const e = ep.episode ?? 0
    const key = `${s}-${e}`
    if (seen.has(key)) continue
    seen.add(key)
    if (!grouped[s]) grouped[s] = []
    grouped[s].push(ep)
  }
  let totalDedupedEpisodes = 0
  for (const key of Object.keys(grouped)) {
    grouped[Number(key)].sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0))
    totalDedupedEpisodes += grouped[Number(key)].length
  }
  return { seasons: grouped, totalDedupedEpisodes }
}

export default function DetailModal({ hit, popularItem, onClose }: DetailModalProps) {
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const queryClient = useQueryClient()
  const [resolvedDocId, setResolvedDocId] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const isPopular = !!popularItem && !hit
  const isListing = hit ? isListingHit(hit) : false
  const contentHit = hit as Hit | null
  const listing = isListing ? (hit as ListingHit) : null

  const popularId = popularItem?.tmdb_id
  useEffect(() => {
    setResolvedDocId(null)
    setResolveError(null)
  }, [popularId])

  const { data: doc, isLoading, error } = useQuery({
    queryKey: ['document', hit?.id],
    queryFn: () => fetchDocument<ContentDoc>(hit!.id),
    enabled: !!hit && !isListing,
  })

  const resolveAndAdd = useMutation({
    mutationFn: async () => {
      if (!popularItem) return
      const sanitizedName = popularItem.title.replace(/[^a-zA-Z0-9 ]/g, '')
      const typeFilter = popularItem.type === 'movie' ? 'movie' : 'series'
      const searchBody = {
        queries: [{
          indexUid: 'iptv_content',
          q: sanitizedName,
          limit: 5,
          filter: `type = "${typeFilter}"`,
        }],
      }
      const resp = await searchClient.post('/multi-search', searchBody)
      const hits = resp.data?.results?.[0]?.hits || []
      if (hits.length === 0) {
        setResolveError('No matching content found in library index')
        return
      }
      let match = hits[0]
      if (popularItem.year) {
        const yearMatch = hits.find((h: any) => h.year === popularItem.year)
        if (yearMatch) match = yearMatch
      }
      const mappedType = typeFilter === 'movie' ? 'movies' : 'series'
      await addToLibrary(mappedType, match.id)
      setResolvedDocId(match.id)
      queryClient.invalidateQueries({ queryKey: ['library'] })
    },
    onMutate: () => {
      setResolving(true)
      setResolveError(null)
    },
    onSettled: () => {
      setResolving(false)
    },
  })

  const { seasons, totalDedupedEpisodes } = useMemo(() => {
    if (!doc || doc.type !== 'series' || !('episodes' in doc)) return { seasons: {} as Record<number, Episode[]>, totalDedupedEpisodes: 0 }
    return groupBySeason(doc.episodes)
  }, [doc])

  const seasonNumbers = useMemo(
    () => Object.keys(seasons).map(Number).sort((a, b) => a - b),
    [seasons],
  )

  // Close on Escape key
  useEffect(() => {
    if (!hit && !popularItem) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hit, popularItem, onClose])

  // TV back handler
  useEffect(() => {
    if ((!hit && !popularItem) || !isTV()) return
    pushBackAction(onClose)
    return () => popBackAction()
  }, [hit, popularItem, onClose])

  // Library state
  const libraryIds = useLibraryIds()
  const addToLib = useAddToLibrary()
  const removeFromLib = useRemoveFromLibrary()

  const cHit = hit && !isListing ? (hit as Hit) : null
  const showLib = cHit && (cHit.type === 'movie' || cHit.type === 'live_tv' || cHit.type === 'series')
  const isInLib = showLib
    ? (cHit!.type === 'movie' ? libraryIds.movies.has(cHit!.id)
      : cHit!.type === 'series' ? libraryIds.series.has(cHit!.id)
      : libraryIds.tv_channels.has(cHit!.id))
    : false

  const handleLibraryToggle = () => {
    if (!cHit || !showLib) return
    const t = cHit.type === 'movie' ? 'movies' : cHit.type === 'series' ? 'series' : 'tv_channels'
    if (isInLib) {
      removeFromLib.mutate({ type: t, id: cHit.id })
    } else {
      addToLib.mutate({ type: t, id: cHit.id })
    }
  }

  // Lock body scroll while open
  useEffect(() => {
    if (hit || popularItem) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [hit, popularItem])

  if (!hit && !popularItem) return null

  const isSeries = !isListing && contentHit?.type === 'series'
  const isMovie = !isListing && contentHit?.type === 'movie'

  const title = isPopular
    ? popularItem!.title
    : isListing
      ? listing!.title
      : contentHit?.series_name || contentHit?.movie_name || contentHit?.name || 'Unknown'

  const imageUrl = isPopular
    ? (popularItem!.poster_path ? `https://image.tmdb.org/t/p/w342/${popularItem!.poster_path}` : null)
    : isListing
      ? listing!.channel_logo
      : (contentHit as Hit)?.logo

  const badgeKey = isPopular
    ? (popularItem!.type === 'movie' ? 'Movie' : 'TV Series')
    : isListing
      ? 'Listing'
      : isSeries
        ? 'Series'
        : isMovie
          ? 'Movie'
          : 'TV Channels'

  const badgeColor = isPopular
    ? (popularItem!.type === 'movie' ? 'bg-blue-600' : 'bg-purple-600')
    : isListing
      ? 'bg-orange-600'
      : isSeries
        ? 'bg-purple-600'
        : isMovie
          ? 'bg-blue-600'
          : 'bg-green-600'

  const showPopularLib = isPopular && !resolvedDocId
  const popularAdded = isPopular && !!resolvedDocId

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-5 border-b border-gray-700 flex-shrink-0">
          {imageUrl ? (
            <img
              src={proxyImageUrl(imageUrl) ?? undefined}
              alt={title}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-800"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-xs flex-shrink-0">
              No image
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded ${badgeColor}`}>
                {badgeKey}
              </span>
              {!isPopular && !isListing && (contentHit as Hit)?.category && (
                <span className="text-xs text-gray-400">
                  {(contentHit as Hit)?.category}
                </span>
              )}
              {isPopular && popularItem!.year && (
                <span className="text-xs text-gray-400">{popularItem!.year}</span>
              )}
              {isListing && listing!.channel_name && (
                <span className="text-xs text-gray-400">{listing!.channel_name}</span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white truncate">{title}</h2>
            {isPopular && (
              <div className="flex items-center gap-2 mt-1">
                <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-yellow-600 text-white">
                  {popularItem!.vote_average.toFixed(1)}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(popularItem!.release_date).toLocaleDateString(
                    undefined, { year: 'numeric', month: 'long', day: 'numeric' }
                  )}
                </span>
              </div>
            )}
            {isSeries && doc && totalDedupedEpisodes > 0 && (
              <p className="text-sm text-gray-400 mt-0.5">
                {totalDedupedEpisodes} episode{totalDedupedEpisodes !== 1 ? 's' : ''}
              </p>
            )}
            {isListing && listing && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-blue-400">
                  {new Date(listing.start_timestamp * 1000).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' })} UTC
                </span>
                {isOnNow(listing.start_timestamp, listing.stop_timestamp) && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-600 text-white animate-pulse">
                    ON NOW
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {showLib && (
              <Tooltip content={isInLib ? 'Remove from Library' : 'Add to Library'}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleLibraryToggle() }}
                  className={`p-1 rounded transition-colors ${
                    isInLib
                      ? 'text-green-400 hover:text-green-300 hover:bg-green-900/40'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {isInLib ? (
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  )}
                </button>
              </Tooltip>
            )}
            {showPopularLib && (
              <Tooltip content={resolving ? 'Adding...' : 'Add to Library'}>
                <button
                  onClick={(e) => { e.stopPropagation(); resolveAndAdd.mutate() }}
                  disabled={resolving}
                  className="text-gray-400 hover:text-white hover:bg-gray-700 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </Tooltip>
            )}
            {popularAdded && (
              <Tooltip content="Added to Library">
                <span className="text-green-400 p-1">
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                </span>
              </Tooltip>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0 p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Popular item view */}
          {isPopular && popularItem && (
            <div className="space-y-4">
              {popularItem.backdrop_path && (
                <div className="w-full h-40 rounded-lg overflow-hidden bg-gray-800">
                  <img
                    src={proxyImageUrl(`https://image.tmdb.org/t/p/w780/${popularItem.backdrop_path}`) ?? undefined}
                    alt={popularItem.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Overview</h3>
                <p className="text-white text-sm">{popularItem.overview}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Rating</h3>
                  <p className="text-white text-sm">{popularItem.vote_average.toFixed(1)} / 10</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    {popularItem.type === 'movie' ? 'Release' : 'First aired'}
                  </h3>
                  <p className="text-white text-sm">
                    {popularItem.release_date
                      ? new Date(popularItem.release_date).toLocaleDateString(
                          undefined, { year: 'numeric', month: 'long', day: 'numeric' }
                        )
                      : 'Unknown'}
                  </p>
                </div>
              </div>
              {resolveError && (
                <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg">
                  <p className="text-red-300 text-sm">{resolveError}</p>
                </div>
              )}
            </div>
          )}

          {/* Listing view */}
          {isListing && listing && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  openPlayer(listing.channel_url, listing.channel_name || listing.title || 'Live TV', 'live')
                  onClose()
                }}
                className="flex items-center gap-1.5 h-9 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                Play Channel
              </button>
              {listing.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Description</h3>
                  <p className="text-white text-sm">{listing.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Channel</h3>
                  <p className="text-white text-sm">{listing.channel_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Starts</h3>
                  <p className="text-white text-sm">
                    {new Date(listing.start_timestamp * 1000).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' })} UTC
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading state for content */}
          {!isListing && !isPopular && isLoading && (
            <p className="text-gray-400 text-sm">Loading...</p>
          )}
          {!isListing && !isPopular && error && (
            <p className="text-red-400 text-sm">Error: {error.message}</p>
          )}

          {/* Series view */}
          {doc && isSeries && seasonNumbers.length > 0 && (
            <div className="space-y-2">
              {seasonNumbers.map((s) => {
                const eps = seasons[s]
                return (
                  <div key={s} className="flex items-center gap-3 px-4 py-3 bg-gray-800 rounded-lg border border-gray-700">
                    <span className="text-sm font-medium text-white">
                      {s === 0 ? 'Specials' : `Season ${s}`}
                    </span>
                    <span className="text-xs text-gray-400">
                      {eps.length} episode{eps.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Movie view */}
          {doc && isMovie && 'movie_name' in doc && (
            <div className="space-y-4">
              {doc.movie_name && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Title</h3>
                  <p className="text-white">{doc.movie_name}</p>
                </div>
              )}
              {doc.category && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Category</h3>
                  <p className="text-white">{doc.category}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
