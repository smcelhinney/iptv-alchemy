import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Hit, Episode, SearchCardItem } from '../types'
import type { ListingHit } from '../types/listings'
import { fetchDocument } from '../lib/api'
import { formatTime, isOnNow, isListingHit } from '../features/shared/utils'
import { pushBackAction, popBackAction } from '../hooks/useTVBackHandler'
import { isTV } from '../lib/device'
import { useLibraryIds, useAddToLibrary, useRemoveFromLibrary } from '../hooks/useLibrary'
import Tooltip from './Tooltip'

interface DetailModalProps {
  hit: SearchCardItem | null
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

export default function DetailModal({ hit, onClose }: DetailModalProps) {

  const isListing = hit ? isListingHit(hit) : false
  const contentHit = hit as Hit | null

  const { data: doc, isLoading, error } = useQuery({
    queryKey: ['document', hit?.id],
    queryFn: () => fetchDocument<ContentDoc>(hit!.id),
    enabled: !!hit && !isListing,
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
    if (!hit) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hit, onClose])

  // TV back handler
  useEffect(() => {
    if (!hit || !isTV()) return
    pushBackAction(onClose)
    return () => popBackAction()
  }, [hit, onClose])

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
    if (hit) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [hit])

  if (!hit) return null

  const isSeries = !isListing && contentHit?.type === 'series'
  const isMovie = !isListing && contentHit?.type === 'movie'
  const listing = isListing ? (hit as ListingHit) : null
  const title = isListing
    ? listing!.title
    : contentHit?.series_name || contentHit?.movie_name || contentHit?.name || 'Unknown'

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
          {(isListing ? listing!.channel_logo : (contentHit as Hit)?.logo) ? (
            <img
              src={isListing ? listing!.channel_logo : (contentHit as Hit)!.logo}
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
              <span className={`px-2 py-0.5 text-xs font-semibold rounded ${isListing ? 'bg-orange-600' : isSeries ? 'bg-purple-600' : isMovie ? 'bg-blue-600' : 'bg-green-600'}`}>
                {isListing ? 'Listing' : isSeries ? 'Series' : isMovie ? 'Movie' : 'TV Channels'}
              </span>
              {(isListing ? listing!.category : (contentHit as Hit)?.category) && (
                <span className="text-xs text-gray-400">
                  {isListing ? listing!.category : (contentHit as Hit)?.category}
                </span>
              )}
              {isListing && listing!.channel_name && (
                <span className="text-xs text-gray-400">{listing!.channel_name}</span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white truncate">{title}</h2>
            {isSeries && doc && totalDedupedEpisodes > 0 && (
              <p className="text-sm text-gray-400 mt-0.5">
                {totalDedupedEpisodes} episode{totalDedupedEpisodes !== 1 ? 's' : ''}
              </p>
            )}
            {isListing && listing && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-blue-400">{formatTime(listing.start_timestamp)}</span>
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
          {/* Listing view */}
          {isListing && listing && (
            <div className="space-y-4">
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
                  <p className="text-white text-sm">{formatTime(listing.start_timestamp)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading state for content */}
          {!isListing && isLoading && (
            <p className="text-gray-400 text-sm">Loading...</p>
          )}
          {!isListing && error && (
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
