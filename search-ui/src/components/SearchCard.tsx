import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { Hit as HitType, SearchCardItem } from '../types'
import type { ListingHit } from '../types/listings'
import { addToLibrary } from '../lib/api'
import { useLibraryIds } from '../hooks/useLibrary'
import { formatTime, isOnNow, isListingHit, TYPE_COLORS, TYPE_LABELS } from '../features/shared/utils'
import { usePlayerStore } from '../stores/playerStore'
import { useFocusable } from '../hooks/useFocusable'
import { useConnectionStatus } from '../contexts/ConnectionStatusContext'
import { isTV } from '../lib/device'
import { proxyImageUrl } from '../lib/proxy'
import Tooltip from './Tooltip'

interface SearchCardProps {
  hit: SearchCardItem
  onSelect: (hit: SearchCardItem) => void
  onRemove?: () => void
  index?: number
  resumeTime?: number
  resumeDuration?: number
  to?: string
  onClearProgress?: () => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

function useIsInLibrary(hit: HitType): boolean {
  const { movies, series, tv_channels } = useLibraryIds()
  if (hit.type === 'movie') return movies.has(hit.id)
  if (hit.type === 'series') return series.has(hit.id)
  if (hit.type === 'live_tv') return tv_channels.has(hit.id)
  return false
}

export default function SearchCard({ hit, onSelect, onRemove, index, resumeTime, resumeDuration, to, onClearProgress, selectable, selected, onToggleSelect }: SearchCardProps) {
  const listing = isListingHit(hit)
  const contentHit = hit as HitType
  const isMovie = !listing && hit.type === 'movie'
  const isLiveTv = !listing && hit.type === 'live_tv'
  const isSeries = !listing && hit.type === 'series'
  const navigate = useNavigate()

  const inLibrary = onRemove ? true : (listing ? false : useIsInLibrary(contentHit))

  const queryClient = useQueryClient()
  const [added, setAdded] = useState(false)
  const openPlayer = usePlayerStore((s) => s.openPlayer)

  const addMutation = useMutation({
    mutationFn: async () => {
      if (contentHit.type === 'movie') {
        return addToLibrary('movies', contentHit.id)
      }
      if (contentHit.type === 'series') {
        return addToLibrary('series', contentHit.id)
      }
      if (contentHit.type === 'live_tv') {
        return addToLibrary('tv_channels', contentHit.id)
      }
    },
    onSuccess: () => {
      setAdded(true)
      queryClient.refetchQueries({ queryKey: ['library'] })
    },
  })

  const showAdded = inLibrary || added
  const showAddToLibrary = !onRemove && (isMovie || isSeries || isLiveTv) && !showAdded

  const badgeKey = listing ? 'listing' : (hit as HitType).type

  const getTitle = () => {
    if (listing) return (hit as ListingHit).title
    return (hit as HitType).series_name || (hit as HitType).movie_name || (hit as HitType).name || 'Unknown'
  }

  const playerUrl = listing ? (hit as ListingHit).channel_url : (hit as HitType).url

  const imageSrc = proxyImageUrl(listing ? (hit as ListingHit).channel_logo : (hit as HitType).logo)

  const listingOnNow = listing ? isOnNow((hit as ListingHit).start_timestamp, (hit as ListingHit).stop_timestamp) : false

  const connStatus = useConnectionStatus()
  const canPlay = !(isLiveTv && connStatus?.is_full)
  const showPlay = !to && !onRemove && (isMovie || isLiveTv || listing)

  const handlePlay = () => {
    const contentType = (isMovie || isSeries) ? 'vod' : 'live'
    openPlayer(playerUrl, getTitle(), contentType, {
      savePlaybackId: (isMovie || isSeries) ? contentHit.id : undefined,
      initialTime: (contentType === 'vod' && resumeTime && resumeTime > 0) ? resumeTime : undefined,
    })
  }

  const handleCardClick = () => {
    if (selectable) {
      onToggleSelect?.()
      return
    }
    if (to) {
      navigate(to)
    } else {
      onSelect(hit)
    }
  }

  // Spatial navigation
  const handleActivate = useCallback(() => {
    handleCardClick()
  }, [hit, onSelect, to, navigate])

  const cardId = `card-${hit.id}${index !== undefined ? `-${index}` : ''}`
  const { ref: cardRef } = useFocusable({
    id: cardId,
    focusGroup: 'cards',
    onActivate: handleActivate,
  })

  const tvMode = isTV()

  return (
    <>
      <div
        ref={tvMode ? cardRef : undefined}
        className="group w-full h-28 max-w-full bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors flex cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Selection checkbox */}
      {selectable && (
        <div className="flex-shrink-0 w-10 flex items-center justify-center bg-gray-800 border-r border-gray-700">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              selected
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-500 group-hover:border-gray-400'
            }`}
          >
            {selected && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Image area */}
        <div className="w-32 flex-shrink-0 bg-gray-900 relative overflow-hidden">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={getTitle()}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
              No image
            </div>
          )}

          {/* ON NOW badge for listings */}
          {listingOnNow && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded animate-pulse">
              ON NOW
            </div>
          )}

      {/* CTA bar - always visible on TV, hover-only on desktop; hidden in select mode */}
      {!to && !selectable && (
            <div className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 py-1.5 bg-black/60 transition-opacity ${
              tvMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              {showPlay && (
                canPlay ? (
                  <Tooltip content="Play">
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePlay() }}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip content={`Stream limit reached (${connStatus?.active_cons ?? 0}/${connStatus?.max_connections ?? 0})`}>
                    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-600 text-gray-400 cursor-not-allowed">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </span>
                  </Tooltip>
                )
              )}
              {!tvMode && showAddToLibrary && (
                <Tooltip content="Add to Library">
                  <button
                    onClick={(e) => { e.stopPropagation(); addMutation.mutate() }}
                    disabled={addMutation.isPending}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                  </button>
                </Tooltip>
              )}
              {onRemove && (
                <Tooltip content="Remove from Library">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove() }}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </Tooltip>
              )}
              {!onRemove && showAdded && !listing && (isMovie || isSeries || isLiveTv) && (
                <Tooltip content="In Library">
                  <span className="w-7 h-7 flex items-center justify-center rounded-full bg-green-600/20 text-green-400">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  </span>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        {/* Details area */}
        <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${TYPE_COLORS[badgeKey] || 'bg-gray-600'}`}>
              {TYPE_LABELS[badgeKey] || 'Unknown'}
            </span>
            {inLibrary && (
              <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          <h3 className="font-semibold text-sm leading-tight line-clamp-1">
            {getTitle()}
          </h3>

          {!selectable && !listing && resumeTime !== undefined && (isMovie || isSeries) && (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1">
                <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: resumeDuration && resumeDuration > 0
                        ? `${Math.min(100, (resumeTime / resumeDuration) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Resume at {Math.floor(resumeTime / 60)}:{String(Math.floor(resumeTime % 60)).padStart(2, '0')}
                </p>
              </div>
              {onClearProgress && (
                <Tooltip content="Clear progress">
                  <button
                    onClick={(e) => { e.stopPropagation(); onClearProgress() }}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Tooltip>
              )}
            </div>
          )}

          {listing && (hit as ListingHit).description && (
            <p className="text-xs text-gray-400 line-clamp-1">{(hit as ListingHit).description}</p>
          )}

          {!listing && isSeries && (hit as HitType).episode_count !== undefined && (
            <p className="text-xs text-gray-400 line-clamp-1">
              {(hit as HitType).episode_count} episode{(hit as HitType).episode_count !== 1 ? 's' : ''}
            </p>
          )}

          <p className="text-[10px] text-gray-500 mt-0.5">
            {listing
              ? `${(hit as ListingHit).channel_name} · ${formatTime((hit as ListingHit).start_timestamp)}`
              : (hit as HitType).category || ''
            }
          </p>
        </div>
      </div>
    </>
  )
}
