import type { ReactNode } from 'react'
import { useCallback } from 'react'
import { proxyImageUrl } from '../lib/proxy'
import { formatDuration } from '../features/shared/utils'
import { useFocusable } from '../hooks/useFocusable'
import type { TMDBMovieMetadata } from '../lib/api/tmdb-service'

export interface MovieDoc {
  id: string
  name: string
  movie_name: string
  category: string
  logo: string
  url: string
  year?: number
}

interface MovieHeroProps {
  doc: MovieDoc
  tmdbData?: TMDBMovieMetadata | null
  progress?: { currentTime: number; duration: number }
  compact?: boolean
  focusGroup?: string
  onPlay: (fromStart: boolean) => void
  extraActions?: ReactNode
  header?: ReactNode
  extraContent?: ReactNode
}

export default function MovieHero({
  doc,
  tmdbData,
  progress,
  compact = false,
  focusGroup = 'content',
  onPlay,
  extraActions,
  header,
  extraContent,
}: MovieHeroProps) {
  const hasProgress = progress && progress.currentTime > 0 && progress.duration > 0
  const isPlayed = hasProgress && (progress!.currentTime / progress!.duration) >= 0.98

  const progressPercent = hasProgress
    ? Math.min(100, (progress!.currentTime / progress!.duration) * 100)
    : 0

  const remainingSeconds = hasProgress
    ? Math.max(0, progress!.duration - progress!.currentTime)
    : 0
  const remainingMinutes = Math.floor(remainingSeconds / 60)

  const handleActivate = useCallback(() => onPlay(false), [onPlay])
  const { ref: playRef } = useFocusable<HTMLButtonElement>({
    id: `movie-hero-play-${doc.id}`,
    focusGroup,
    onActivate: handleActivate,
  })

  const year = tmdbData?.release_date?.split('-')[0] || doc?.year
  const runtime = tmdbData?.runtime
  const genres = tmdbData?.genres ?? []
  const rating = tmdbData?.vote_average

  const backdropHeight = compact ? 'h-64' : 'h-[28rem]'
  const posterClass = compact
    ? 'hidden lg:block w-40 h-56 rounded-lg object-cover bg-gray-800 flex-shrink-0'
    : 'hidden lg:block w-[350px] h-[490px] rounded-lg object-cover bg-gray-800 flex-shrink-0'
  const placeholderClass = compact
    ? 'hidden lg:block w-40 h-56 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-sm flex-shrink-0'
    : 'hidden lg:block w-[350px] h-[490px] rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-sm flex-shrink-0'

  return (
    <div>
      {/* Backdrop */}
      {tmdbData?.backdrop_url && (
        <div className={`${compact ? 'relative' : 'sticky top-0'} w-full ${backdropHeight} overflow-hidden`}>
          <img
            src={tmdbData.backdrop_url}
            alt={tmdbData.title || doc.movie_name || doc.name || ''}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/40 to-gray-900" />
        </div>
      )}

      {/* Content */}
      <div
        className={`relative z-10 px-6 pb-6 ${
          tmdbData?.backdrop_url
            ? compact
              ? 'pt-4'
              : '-mt-[28rem] pt-[30px]'
            : 'pt-[30px]'
        }`}
      >
        {header}

        <div className="flex gap-6 mb-4">
          {/* Poster */}
          {tmdbData?.poster_url || doc.logo ? (
            <img
              src={tmdbData?.poster_url || proxyImageUrl(doc.logo)}
              alt={doc.movie_name || doc.name}
              className={posterClass}
            />
          ) : (
            <div className={placeholderClass}>No image</div>
          )}

          {/* Info + controls */}
          <div className="flex-1 flex flex-col min-w-0">
            <h1 className="text-2xl font-bold text-white mb-1 truncate">
              {tmdbData?.title || doc.movie_name || doc.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400 mb-2">
              {rating != null && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {rating.toFixed(1)}
                </span>
              )}
              {rating != null && year && <span>|</span>}
              {year && <span>{year}</span>}
              {year && runtime && <span>|</span>}
              {runtime && <span>{runtime} min</span>}
              {((year || runtime) && genres.length > 0) && <span>|</span>}
              {genres.length > 0 && (
                <span className="truncate">{genres.join(', ')}</span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {hasProgress && !isPlayed ? (
                <>
                  <button
                    ref={playRef}
                    onClick={(e) => { e.stopPropagation(); onPlay(false) }}
                    className="flex items-center gap-1.5 h-9 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    Resume
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onPlay(true) }}
                    className="flex items-center gap-1.5 h-9 px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                    Start from Beginning
                  </button>
                </>
              ) : hasProgress && isPlayed ? (
                <button
                  ref={playRef}
                  onClick={(e) => { e.stopPropagation(); onPlay(true) }}
                  className="flex items-center gap-1.5 h-9 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  Start from Beginning
                </button>
              ) : (
                <button
                  ref={playRef}
                  onClick={(e) => { e.stopPropagation(); onPlay(false) }}
                  className="flex items-center gap-1.5 h-9 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  Play
                </button>
              )}

              {extraActions}
            </div>

            {/* Progress */}
            {hasProgress && (
              <div className="mt-3 flex items-center gap-3 max-w-md">
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isPlayed ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDuration(remainingMinutes)} remaining
                </span>
              </div>
            )}

            {extraContent}

            {tmdbData?.tagline && (
              <h2 className="text-base font-semibold text-white mb-1 mt-4">{tmdbData.tagline}</h2>
            )}

            {tmdbData?.overview && (
              <p className="text-sm text-gray-300 leading-relaxed">{tmdbData.overview}</p>
            )}

            {tmdbData?.director && (
              <p className="text-sm text-gray-400 italic mt-3">Directed by {tmdbData.director}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
