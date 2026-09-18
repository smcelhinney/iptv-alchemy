import type { ReactNode } from 'react'
import { proxyImageUrl } from '../lib/proxy'
import type { TMDBSeriesMetadata } from '../lib/api/tmdb-service'
import type { Episode } from '../types'

export interface SeriesDoc {
  id: string
  name: string
  series_name: string
  category: string
  logo: string
  episodes: Episode[]
}

interface ShowHeroProps {
  doc: SeriesDoc
  tmdbData?: TMDBSeriesMetadata | null
  compact?: boolean
  playButton?: ReactNode
  extraActions?: ReactNode
  header?: ReactNode
}

export default function ShowHero({
  doc,
  tmdbData,
  compact = false,
  playButton,
  extraActions,
  header,
}: ShowHeroProps) {
  const year = tmdbData?.first_air_date?.split('-')[0]
  const endYear = tmdbData?.last_air_date?.split('-')[0]
  const numSeasons =
    tmdbData?.number_of_seasons ??
    (doc?.episodes
      ? [...new Set(doc.episodes.map((ep) => ep.season ?? 0))].length
      : 0)
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
            alt={tmdbData.title || doc.series_name || doc.name || ''}
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
              alt={doc.series_name || doc.name}
              className={posterClass}
            />
          ) : (
            <div className={placeholderClass}>No image</div>
          )}

          {/* Info + controls */}
          <div className="flex-1 flex flex-col min-w-0">
            <h1 className="text-2xl font-bold text-white mb-1 truncate">
              {tmdbData?.title || doc.series_name || doc.name}
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
              {year && (
                <span>
                  {year}
                  {endYear && endYear !== year ? ` - ${endYear}` : ''}
                </span>
              )}
              {year && numSeasons > 0 && <span>|</span>}
              {numSeasons > 0 && (
                <span>
                  {numSeasons} season{numSeasons !== 1 ? 's' : ''}
                </span>
              )}
              {((year || numSeasons > 0) && genres.length > 0) && <span>|</span>}
              {genres.length > 0 && (
                <span className="truncate">{genres.join(', ')}</span>
              )}
            </div>

            {tmdbData?.tagline && (
              <h2 className="text-base font-semibold text-white mb-1">{tmdbData.tagline}</h2>
            )}

            {tmdbData?.overview && (
              <p className="text-sm text-gray-300 leading-relaxed">{tmdbData.overview}</p>
            )}

            {tmdbData?.creator && (
              <p className="text-sm text-gray-400 italic mt-3">Created by {tmdbData.creator}</p>
            )}

            {/* Controls */}
            {(playButton || extraActions) && (
              <div className="flex items-center gap-2 flex-wrap mt-4">
                {playButton}
                {extraActions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
