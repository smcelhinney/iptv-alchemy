import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchDocument, fetchEmbyStatus, addToEmby, removeFromEmby } from '../lib/api'
import { usePlaybackMemory, useDeletePlaybackMemory } from '../hooks/usePlaybackMemory'
import { useRemoveFromLibrary } from '../hooks/useLibrary'
import { usePlayerStore } from '../stores/playerStore'
import type { Episode } from '../types'
import Tooltip from '../components/Tooltip'

interface SeriesDoc {
  id: string
  name: string
  series_name: string
  episodes: Episode[]
}

export default function SeasonDetailPage() {
  const { id, seasonNum } = useParams<{ id: string; seasonNum: string }>()
  const navigate = useNavigate()
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const queryClient = useQueryClient()

  const season = seasonNum ? parseInt(seasonNum, 10) : 0

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument<SeriesDoc>(id!),
    enabled: !!id,
  })

  const { data: embyStatus } = useQuery({
    queryKey: ['emby-status'],
    queryFn: fetchEmbyStatus,
    staleTime: 10_000,
  })

  const { data: playbackMemory } = usePlaybackMemory()
  const clearProgress = useDeletePlaybackMemory()

  const seriesName = doc?.series_name

  const seasonEpisodes = doc?.episodes?.filter((ep) => (ep.season ?? 0) === season) ?? []

  const isEpisodeInEmby = (ep: Episode) => {
    if (!seriesName) return false
    const stem = `${seriesName} S${String(season).padStart(2, '0')}E${String(ep.episode ?? 0).padStart(2, '0')}`
    const seriesEntry = embyStatus?.tv[seriesName]
    if (!seriesEntry) return false
    for (const files of Object.values(seriesEntry)) {
      if (files.includes(stem)) return true
    }
    return false
  }

  const seasonInEmby = seriesName && embyStatus?.tv[seriesName]
    ? Object.keys(embyStatus.tv[seriesName]).some((k) => k === `Season ${String(season).padStart(2, '0')}`)
    : false

  const handlePlay = (ep: Episode) => {
    const mem = id && playbackMemory ? playbackMemory[ep.id] : undefined
    const epTitle = ep.episode_name || ep.name
    const displayTitle = doc?.series_name
      ? `${doc.series_name} - S${ep.season ?? '?'}E${ep.episode ?? '?'} - ${epTitle}`
      : epTitle
    openPlayer(ep.url, displayTitle, 'vod', {
      savePlaybackId: ep.id,
      initialTime: mem && mem.currentTime > 0 ? mem.currentTime : undefined,
    })
  }

  const handleSyncSeason = async () => {
    if (!id) return
    await addToEmby(id, 'series', season)
    queryClient.refetchQueries({ queryKey: ['emby-status'] })
  }

  const handleRemoveSeason = async () => {
    if (!seriesName) return
    await removeFromEmby({ type: 'series', series_name: seriesName, season })
    queryClient.refetchQueries({ queryKey: ['emby-status'] })
  }

  const removeFromLibrary = useRemoveFromLibrary()

  const handleRemoveFromLibrary = () => {
    removeFromLibrary.mutate({ type: 'series', id: id! }, {
      onSuccess: () => navigate('/library/tv-shows'),
    })
  }

  const handleSyncEpisode = async (ep: Episode) => {
    if (!id || ep.episode == null) return
    await addToEmby(id, 'series', season, ep.episode)
    queryClient.refetchQueries({ queryKey: ['emby-status'] })
  }

  const handleRemoveEpisode = async (ep: Episode) => {
    if (!seriesName || ep.episode == null) return
    await removeFromEmby({ type: 'series', series_name: seriesName, season, episode: ep.episode })
    queryClient.refetchQueries({ queryKey: ['emby-status'] })
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <button
        onClick={() => navigate(`/library/tv-shows/${id}`)}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to {doc?.series_name || 'Show'}
      </button>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      {doc && (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">
              {doc.series_name} - {season === 0 ? 'Specials' : `Season ${season}`}
            </h1>
            {seasonInEmby ? (
              <button
                onClick={handleRemoveSeason}
                className="text-xs text-red-400 hover:text-red-300 underline"
              >
                Remove season from media server
              </button>
            ) : (
              <button
                onClick={handleSyncSeason}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Sync season to media server
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Library</span>
            <button
              onClick={handleRemoveFromLibrary}
              className="text-xs text-red-400 hover:text-red-300 underline transition-colors"
            >
              Remove from Library
            </button>
          </div>

          <div className="border-t border-gray-700 mb-4" />

          {seasonEpisodes.length === 0 ? (
            <p className="text-gray-400 text-sm">No episodes found for this season.</p>
          ) : (
            <div className="space-y-1">
              {seasonEpisodes.map((ep) => {
                const epInEmby = isEpisodeInEmby(ep)
                const mem = id && playbackMemory ? playbackMemory[ep.id] : undefined

                return (
                  <div
                    key={ep.id}
                    className="flex items-center gap-3 px-4 py-2.5 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-gray-700 text-blue-400 rounded flex-shrink-0">
                      {ep.full_episode_id || `E${ep.episode ?? '?'}`}
                    </span>
                    <span className="text-sm text-gray-300 truncate flex-1">
                      {ep.episode_name || ep.name}
                    </span>

                    {mem && mem.currentTime > 0 && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: mem.duration > 0
                                ? `${Math.min(100, (mem.currentTime / mem.duration) * 100)}%`
                                : '0%',
                            }}
                          />
                        </div>
                        <Tooltip content="Clear progress">
                          <button
                            onClick={() => clearProgress.mutate(ep.id)}
                            className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </Tooltip>
                      </div>
                    )}

                    <Tooltip content="Play">
                      <button
                        onClick={() => handlePlay(ep)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </button>
                    </Tooltip>

                    {ep.episode != null && (
                      epInEmby ? (
                        <Tooltip content="Remove from Emby">
                          <button
                            onClick={() => handleRemoveEpisode(ep)}
                            className="w-6 h-6 flex items-center justify-center rounded text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors flex-shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                            </svg>
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip content="Add to Emby">
                          <button
                            onClick={() => handleSyncEpisode(ep)}
                            className="w-6 h-6 flex items-center justify-center rounded text-blue-400 hover:bg-blue-900/40 hover:text-blue-300 transition-colors flex-shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                          </button>
                        </Tooltip>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
