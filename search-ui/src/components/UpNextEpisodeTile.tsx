import { useCallback } from 'react'
import { formatDuration } from '../features/shared/utils'
import { useFocusable } from '../hooks/useFocusable'
import type { Episode } from '../types'
import type { TMDBEpisode } from '../lib/api/tmdb-service'
import Tooltip from './Tooltip'

interface UpNextEpisodeTileProps {
  episode: Episode
  tmdbEpisode?: TMDBEpisode | null
  progress?: { currentTime: number; duration: number }
  onPlay: () => void
}

export default function UpNextEpisodeTile({ episode, tmdbEpisode, progress, onPlay }: UpNextEpisodeTileProps) {
  const hasProgress = progress && progress.currentTime > 0 && progress.duration > 0
  const isPlayed = hasProgress && (progress!.currentTime / progress!.duration) >= 0.98
  const progressPct = hasProgress
    ? Math.min(100, (progress!.currentTime / progress!.duration) * 100)
    : 0

  const handleActivate = useCallback(() => {
    onPlay()
  }, [onPlay])

  const { ref: playRef } = useFocusable<HTMLButtonElement>({
    id: `up-next-episode-${episode.id}`,
    focusGroup: 'up-next',
    onActivate: handleActivate,
  })

  return (
    <div className="flex-shrink-0 w-64 group">
      <div className="relative w-full h-36 rounded-lg overflow-hidden bg-gray-800 mb-2">
        {tmdbEpisode?.still_url ? (
          <img
            src={tmdbEpisode.still_url}
            alt={tmdbEpisode.name || episode.episode_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
            No image
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <Tooltip content="Play episode">
            <button
              ref={playRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); onPlay() }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 text-white cursor-pointer pointer-events-auto appearance-none border-none p-0 m-0"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {hasProgress ? (
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full ${isPlayed ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      ) : (
        <div className="w-full h-1 mb-2" />
      )}

      <p className="text-xs text-gray-400 font-medium mb-0.5">
        S{episode.season ?? '?'} E{episode.episode ?? '?'} - {tmdbEpisode?.name || episode.episode_name || episode.name}
      </p>
      <p className="text-[11px] text-gray-500">
        {tmdbEpisode?.air_date || ''}
        {tmdbEpisode?.air_date && tmdbEpisode?.runtime ? ' · ' : ''}
        {tmdbEpisode?.runtime ? formatDuration(tmdbEpisode.runtime) : ''}
      </p>
    </div>
  )
}
