import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFocusable } from '../../../hooks/useFocusable'
import { useTMDBMovie, useTMDBSeries } from '../../../hooks/useTMDB'
import { usePlayerStore } from '../../../stores/playerStore'
import { formatDuration } from '../../../features/shared/utils'
import type { UpNextItem } from '../../../lib/api/up-next-service'
import type { MovieDoc } from '../../../components/MovieHero'
import type { SeriesDoc } from '../../../components/ShowHero'
import type { Episode } from '../../../types'

function progressPercent(currentTime: number, duration: number): number {
  if (duration <= 0) return 0
  return Math.min(100, (currentTime / duration) * 100)
}

function PlayButton({
  id,
  onClick,
  label,
}: {
  id: string
  onClick: () => void
  label: string
}) {
  const handleActivate = useCallback(() => onClick(), [onClick])
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `up-next-play-${id}`,
    focusGroup: 'up-next',
    onActivate: handleActivate,
  })

  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="flex items-center gap-1.5 h-8 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
      </svg>
      {label}
    </button>
  )
}

function UpNextMovieCard({ item }: { item: UpNextItem & { type: 'movie' } }) {
  const navigate = useNavigate()
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const { data: tmdbData } = useTMDBMovie(item.id)
  const doc = item.doc as unknown as MovieDoc

  const title = tmdbData?.title || doc.movie_name || doc.name
  const year = tmdbData?.release_date?.split('-')[0] || doc.year
  const runtime = tmdbData?.runtime
  const genres = tmdbData?.genres ?? []
  const rating = tmdbData?.vote_average
  const poster = tmdbData?.poster_url || doc.logo

  const remainingMinutes = Math.max(0, item.progress.duration - item.progress.currentTime) / 60
  const pct = progressPercent(item.progress.currentTime, item.progress.duration)

  const handlePlay = () => {
    if (!doc.url) return
    openPlayer(doc.url, title || 'Unknown', 'vod', {
      savePlaybackId: item.id,
      initialTime: item.progress.currentTime,
    })
  }

  return (
    <div
      onClick={() => navigate(`/library/movies/${item.id}`)}
      className="flex-shrink-0 w-[22rem] sm:w-[26rem] bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-600 overflow-hidden cursor-pointer transition-colors"
    >
      <div className="flex h-full">
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="w-28 sm:w-32 h-full object-cover bg-gray-800 flex-shrink-0"
          />
        ) : (
          <div className="w-28 sm:w-32 h-full bg-gray-800 flex items-center justify-center text-gray-600 text-xs flex-shrink-0">
            No image
          </div>
        )}

        <div className="flex-1 p-4 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-600 text-white">
              Movie
            </span>
            {rating != null && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <svg className="w-3 h-3 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {rating.toFixed(1)}
              </span>
            )}
          </div>

          <h3 className="font-bold text-white truncate">{title}</h3>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 mb-2">
            {year && <span>{year}</span>}
            {year && runtime && <span>|</span>}
            {runtime && <span>{runtime} min</span>}
            {((year || runtime) && genres.length > 0) && <span>|</span>}
            {genres.length > 0 && <span className="truncate">{genres.slice(0, 2).join(', ')}</span>}
          </div>

          {tmdbData?.overview && (
            <p className="text-xs text-gray-300 line-clamp-3 mb-3">{tmdbData.overview}</p>
          )}

          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                {formatDuration(Math.floor(remainingMinutes))} left
              </span>
            </div>
            <PlayButton id={item.id} onClick={handlePlay} label="Resume" />
          </div>
        </div>
      </div>
    </div>
  )
}

function UpNextSeriesCard({ item }: { item: UpNextItem & { type: 'series' } }) {
  const navigate = useNavigate()
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const { data: tmdbData } = useTMDBSeries(item.id)
  const doc = item.doc as unknown as SeriesDoc
  const episode = item.episode as unknown as Episode

  const title = tmdbData?.title || doc.series_name || doc.name
  const year = tmdbData?.first_air_date?.split('-')[0]
  const endYear = tmdbData?.last_air_date?.split('-')[0]
  const numSeasons = tmdbData?.number_of_seasons ??
    (doc.episodes ? [...new Set(doc.episodes.map((ep) => ep.season ?? 0))].length : 0)
  const genres = tmdbData?.genres ?? []
  const rating = tmdbData?.vote_average
  const poster = tmdbData?.poster_url || doc.logo

  const tmdbEpisode = tmdbData?.seasons
    ?.flatMap((s) => s.episodes)
    ?.find(
      (e) => e.season_number === episode.season && e.episode_number === episode.episode
    )

  const epTitle = tmdbEpisode?.name || episode.episode_name || episode.name
  const remainingMinutes = Math.max(0, item.progress.duration - item.progress.currentTime) / 60
  const pct = progressPercent(item.progress.currentTime, item.progress.duration)

  const handlePlay = () => {
    if (!episode.url) return
    const displayTitle = `${title || 'Unknown'} - S${episode.season ?? '?'}E${episode.episode ?? '?'} - ${epTitle}`
    openPlayer(episode.url, displayTitle, 'vod', {
      savePlaybackId: episode.id,
      initialTime: item.progress.currentTime,
    })
  }

  return (
    <div
      onClick={() => navigate(`/library/tv-shows/${item.id}`)}
      className="flex-shrink-0 w-[22rem] sm:w-[26rem] bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-600 overflow-hidden cursor-pointer transition-colors"
    >
      <div className="flex h-full">
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="w-28 sm:w-32 h-full object-cover bg-gray-800 flex-shrink-0"
          />
        ) : (
          <div className="w-28 sm:w-32 h-full bg-gray-800 flex items-center justify-center text-gray-600 text-xs flex-shrink-0">
            No image
          </div>
        )}

        <div className="flex-1 p-4 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-600 text-white">
              Series
            </span>
            {rating != null && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <svg className="w-3 h-3 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {rating.toFixed(1)}
              </span>
            )}
          </div>

          <h3 className="font-bold text-white truncate">{title}</h3>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 mb-2">
            {year && (
              <span>
                {year}
                {endYear && endYear !== year ? ` - ${endYear}` : ''}
              </span>
            )}
            {year && numSeasons > 0 && <span>|</span>}
            {numSeasons > 0 && <span>{numSeasons} season{numSeasons !== 1 ? 's' : ''}</span>}
            {((year || numSeasons > 0) && genres.length > 0) && <span>|</span>}
            {genres.length > 0 && <span className="truncate">{genres.slice(0, 2).join(', ')}</span>}
          </div>

          <p className="text-xs text-gray-300 mb-1">
            Continue S{episode.season ?? '?'}E{episode.episode ?? '?'} - {epTitle}
          </p>

          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                {formatDuration(Math.floor(remainingMinutes))} left
              </span>
            </div>
            <PlayButton id={item.id} onClick={handlePlay} label="Resume" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UpNextCard({ item }: { item: UpNextItem }) {
  if (item.type === 'movie') {
    return <UpNextMovieCard item={item as UpNextItem & { type: 'movie' }} />
  }
  return <UpNextSeriesCard item={item as UpNextItem & { type: 'series' }} />
}
