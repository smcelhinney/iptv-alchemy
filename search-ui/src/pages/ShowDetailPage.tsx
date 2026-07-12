import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { VscSync, VscSyncIgnored } from 'react-icons/vsc'
import { FaRegCircleCheck } from 'react-icons/fa6'
import { FaCheckCircle } from 'react-icons/fa'
import { MdOutlineSubtitles } from 'react-icons/md'
import { fetchDocument, fetchEmbyStatus, fetchConfig, addToEmby, removeFromEmby } from '../lib/api'
import { usePlaybackMemory, useSavePlaybackMemory, useDeletePlaybackMemory } from '../hooks/usePlaybackMemory'
import { useGetNextPlayableEpisode } from '../hooks/useNextPlayableEpisode'
import { useRemoveFromLibrary } from '../hooks/useLibrary'
import { useTMDBSeries } from '../hooks/useTMDB'
import { usePlayerStore } from '../stores/playerStore'
import TMDBMetadataModalTV from '../components/TMDBMetadataModalTV'
import SubtitleSearchModal from '../components/SubtitleSearchModal'
import Tooltip from '../components/Tooltip'
import AddToCollectionModal from '../components/AddToCollectionModal'
import PersonModal from '../components/PersonModal'
import { proxyImageUrl } from '../lib/proxy'
import { aggregateCrew } from '../features/shared/utils'
import { useEpisodeSubtitle } from '../hooks/useSubtitles'
import type { Episode } from '../types'

interface SeriesDoc {
  id: string
  name: string
  series_name: string
  category: string
  logo: string
  episodes: Episode[]
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

function truncate(str: string | undefined, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

export default function ShowDetailPage() {
  const { id, seasonNum: seasonNumParam } = useParams<{ id: string; seasonNum?: string }>()
  const navigate = useNavigate()
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const queryClient = useQueryClient()
  const [embyLoading, setEmbyLoading] = useState(false)
  const [showTMDBModal, setShowTMDBModal] = useState(false)
  const [subtitleModalEp, setSubtitleModalEp] = useState<{ epId: string; season: number; episode: number } | null>(null)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)

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

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
    staleTime: 60_000,
  })

  const { data: playbackMemory } = usePlaybackMemory()
  const { nextEpisode } = useGetNextPlayableEpisode(id)
  const { data: tmdbData, isLoading: tmdbLoading } = useTMDBSeries(id ?? '')

  const hasTmdbKey = (config?.tmdb_api_key ?? '') !== ''
  const hasOpenSubtitlesCreds =
    (config?.opensubtitles_api_key ?? '') !== '' &&
    (config?.opensubtitles_username ?? '') !== '' &&
    (config?.opensubtitles_password ?? '') !== ''

  const seriesName = doc?.series_name

  const seasons = useMemo(() => {
    const ourSeasons = doc?.episodes
      ? [...new Set(doc.episodes.map((ep) => ep.season ?? 0))].sort((a, b) => a - b)
      : []
    if (tmdbData?.seasons) {
      const tmdbSeasonNums = tmdbData.seasons.map((s) => s.season_number ?? 0)
      // Only show seasons that exist in both TMDB and our data
      return tmdbSeasonNums.filter((s) => ourSeasons.includes(s))
    }
    return ourSeasons
  }, [tmdbData, doc])

  const activeSeason = seasonNumParam ? parseInt(seasonNumParam, 10) : seasons[0] ?? 0

  // Find TMDB season data
  const tmdbSeason = tmdbData?.seasons?.find((s) => s.season_number === activeSeason)

  // Our episodes for this season
  const ourEpisodes = doc?.episodes?.filter((ep) => (ep.season ?? 0) === activeSeason) ?? []

  // Match our episodes with TMDB episodes
  const matchedEpisodes = useMemo(() => {
    return ourEpisodes.map((ourEp) => {
      const tmdbEp = tmdbSeason?.episodes?.find(
        (te) => te.season_number === ourEp.season && te.episode_number === ourEp.episode
      )
      return { our: ourEp, tmdb: tmdbEp }
    })
  }, [ourEpisodes, tmdbSeason])

  const isSeasonInEmby = (season: number) => {
    if (!seriesName || !embyStatus?.tv[seriesName]) return false
    const seasonKey = `Season ${String(season).padStart(2, '0')}`
    return seasonKey in embyStatus.tv[seriesName]
  }

  const seasonInEmby = isSeasonInEmby(activeSeason)

  const handleSyncSeason = async () => {
    if (!id) return
    setEmbyLoading(true)
    await addToEmby(id, 'series', activeSeason)
    queryClient.refetchQueries({ queryKey: ['emby-status'] })
    setEmbyLoading(false)
  }

  const handleRemoveSeason = async () => {
    if (!seriesName) return
    setEmbyLoading(true)
    await removeFromEmby({ type: 'series', series_name: seriesName, season: activeSeason })
    queryClient.refetchQueries({ queryKey: ['emby-status'] })
    setEmbyLoading(false)
  }

  const handlePlayEpisode = (ep: Episode, tmdbName?: string) => {
    const mem = id && playbackMemory ? playbackMemory[ep.id] : undefined
    const epTitle = tmdbName || ep.episode_name || ep.name
    const displayTitle = seriesName
      ? `${seriesName} - S${ep.season ?? '?'}E${ep.episode ?? '?'} - ${epTitle}`
      : epTitle
    openPlayer(ep.url, displayTitle, 'vod', {
      savePlaybackId: ep.id,
      initialTime: mem && mem.currentTime > 0 ? mem.currentTime : undefined,
    })
  }

  const handlePlayNext = () => {
    if (!nextEpisode) return
    handlePlayEpisode(nextEpisode)
  }

  const savePlayback = useSavePlaybackMemory()
  const deletePlayback = useDeletePlaybackMemory()

  const handleTogglePlayed = (epId: string, existingDuration?: number, runtimeMinutes?: number) => {
    const mem = playbackMemory?.[epId]
    const isPlayed = mem && mem.currentTime > 0 && mem.duration > 0 && (mem.currentTime / mem.duration) >= 0.98

    if (isPlayed) {
      deletePlayback.mutate(epId)
    } else {
      const duration = existingDuration || (runtimeMinutes ? runtimeMinutes * 60 : 3600)
      savePlayback.mutate({ id: epId, currentTime: duration, duration })
    }
  }

  // Determine if every episode in the active season is marked as played
  const allPlayed = useMemo(() => {
    if (!ourEpisodes.length) return false
    return ourEpisodes.every((ep) => {
      const mem = playbackMemory?.[ep.id]
      return mem && mem.currentTime > 0 && mem.duration > 0 && (mem.currentTime / mem.duration) >= 0.98
    })
  }, [ourEpisodes, playbackMemory])

  const handleToggleAllPlayed = () => {
    if (allPlayed) {
      // Mark all as unplayed
      ourEpisodes.forEach((ep) => {
        const mem = playbackMemory?.[ep.id]
        const isPlayed = mem && mem.currentTime > 0 && mem.duration > 0 && (mem.currentTime / mem.duration) >= 0.98
        if (isPlayed) {
          deletePlayback.mutate(ep.id)
        }
      })
    } else {
      // Mark all as played
      matchedEpisodes.forEach(({ our, tmdb: tmdbEp }) => {
        const mem = playbackMemory?.[our.id]
        const isPlayed = mem && mem.currentTime > 0 && mem.duration > 0 && (mem.currentTime / mem.duration) >= 0.98
        if (!isPlayed) {
          const duration = mem?.duration || (tmdbEp?.runtime ? tmdbEp.runtime * 60 : 3600)
          savePlayback.mutate({ id: our.id, currentTime: duration, duration })
        }
      })
    }
  }

  const removeFromLibrary = useRemoveFromLibrary()

  const handleRemoveFromLibrary = () => {
    removeFromLibrary.mutate({ type: 'series', id: id! }, {
      onSuccess: () => navigate('/library/tv-shows'),
    })
  }

  const year = tmdbData?.first_air_date?.split('-')[0]
  const endYear = tmdbData?.last_air_date?.split('-')[0]
  const numSeasons = tmdbData?.number_of_seasons ?? (doc?.episodes
    ? [...new Set(doc.episodes.map((ep) => ep.season ?? 0))].length
    : 0)
  const genres = tmdbData?.genres ?? []
  const rating = tmdbData?.vote_average

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Sticky backdrop */}
      {tmdbData?.backdrop_url && (
        <div className="sticky top-0 w-full h-[28rem] overflow-hidden">
          <img
            src={tmdbData.backdrop_url}
            alt={tmdbData.title || doc?.series_name || doc?.name || ''}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/40 to-gray-900" />
          </div>
        )}

      {/* Content */}
      <div className={`relative z-10 px-6 pb-6 ${tmdbData?.backdrop_url ? '-mt-[28rem] pt-[30px]' : 'pt-[30px]'}`}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to TV Shows
        </button>

        {isLoading && <p className="text-gray-400">Loading...</p>}

        {doc && (
          <div>
            <div className="flex gap-6 mb-4">
              {/* Left: Thumbnail */}
              {tmdbData?.poster_url || doc.logo ? (
                <img
                  src={tmdbData?.poster_url || proxyImageUrl(doc.logo)}
                  alt={doc.series_name || doc.name}
                  className="hidden lg:block w-[350px] h-[490px] rounded-lg object-cover bg-gray-800 flex-shrink-0"
                />
              ) : (
                <div className="hidden lg:block w-[350px] h-[490px] rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-sm flex-shrink-0">
                  No image
                </div>
              )}

              {/* Right: Info + Controls */}
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
                  {year && <span>{year}{endYear && endYear !== year ? ` - ${endYear}` : ''}</span>}
                  {year && numSeasons > 0 && <span>|</span>}
                  {numSeasons > 0 && <span>{numSeasons} season{numSeasons !== 1 ? 's' : ''}</span>}
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

                {/* Controls row */}
                <div className="flex items-center gap-2 flex-wrap mt-4">
                  {/* Play next */}
                  {nextEpisode && (
                    <button
                      onClick={handlePlayNext}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                      Play
                    </button>
                  )}

                  {/* Sync / Unsync */}
                  {embyLoading ? (
                    <Tooltip content="Syncing...">
                      <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700">
                        <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </span>
                    </Tooltip>
                  ) : (
                    <Tooltip content={seasonInEmby ? 'Unsync season from media server' : 'Sync season to media server'}>
                      <button
                        onClick={seasonInEmby ? handleRemoveSeason : handleSyncSeason}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                      >
                        {seasonInEmby ? (
                          <VscSyncIgnored className="w-4 h-4" />
                        ) : (
                          <VscSync className="w-4 h-4" />
                        )}
                      </button>
                    </Tooltip>
                  )}

                  {/* TMDB metadata */}
                  {!tmdbLoading && (hasTmdbKey ? (
                    <Tooltip content={tmdbData ? 'Update TMDB metadata' : 'Get TMDB metadata'}>
                      <button
                        onClick={() => setShowTMDBModal(true)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Set TMDB API key in Admin → Configuration">
                      <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 text-gray-600 cursor-not-allowed">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </span>
                    </Tooltip>
                  ))}

                  {/* Remove from Library */}
                  <Tooltip content="Remove from Library">
                    <button
                      onClick={handleRemoveFromLibrary}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </Tooltip>

                  {/* Add to Collection */}
                  <Tooltip content="Add to Collection">
                    <button
                      onClick={() => setShowCollectionModal(true)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                      </svg>
                    </button>
                  </Tooltip>

                  {/* More */}
                  <Tooltip content="More options">
                    <button
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                    >
                      ...
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Episodes + Cast below backdrop */}
        {doc && (
          <div>
            {/* Season dropdown + Mark All */}
            {seasons.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <select
                  value={activeSeason}
                  onChange={(e) => navigate(`/library/tv-shows/${id}/season/${e.target.value}`)}
                  className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {seasons.map((s) => (
                    <option key={s} value={s}>
                      {s === 0 ? 'Specials' : `Season ${s}`}
                      {tmdbData?.seasons?.find((ts) => ts.season_number === s)?.episode_count
                        ? ` (${tmdbData.seasons.find((ts) => ts.season_number === s)?.episode_count} episodes)`
                        : ''}
                    </option>
                  ))}
                </select>
                <Tooltip content={allPlayed ? 'Mark season as unplayed' : 'Mark season as played'}>
                  <button
                    onClick={handleToggleAllPlayed}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                  >
                    {allPlayed ? (
                      <FaCheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <FaRegCircleCheck className="w-5 h-5 text-white" />
                    )}
                  </button>
                </Tooltip>
              </div>
            )}

            {/* Horizontal scrolling episode tiles */}
            {matchedEpisodes.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-4 mb-6">
                {matchedEpisodes.map(({ our, tmdb: tmdbEp }) => {
                  const mem = id && playbackMemory ? playbackMemory[our.id] : undefined
                  const hasProgress = mem && mem.currentTime > 0 && mem.duration > 0
                  const progressPct = hasProgress
                    ? Math.min(100, (mem.currentTime / mem.duration) * 100)
                    : 0
                  const isPlayed = hasProgress && progressPct >= 98

                  return (
                    <div
                      key={our.id}
                      className="flex-shrink-0 w-48 group"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-full h-28 rounded-lg overflow-hidden bg-gray-800 mb-2">
                        {tmdbEp?.still_url ? (
                          <img
                            src={tmdbEp.still_url}
                            alt={tmdbEp.name || our.episode_name}
                            className="w-full h-full object-cover group-hover:brightness-50 transition-all"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                            No image
                          </div>
                        )}

                        {/* Play button on hover — only clickable element */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Tooltip content="Play episode">
                            <div
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-green-600 text-white cursor-pointer pointer-events-auto"
                              onClick={() => handlePlayEpisode(our, tmdbEp?.name)}
                            >
                              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                              </svg>
                            </div>
                          </Tooltip>
                        </div>

                        {/* Subtitle search */}
                        {tmdbData?.tmdb_id && hasOpenSubtitlesCreds && (
                          <EpisodeSubtitleIcon
                            epId={our.id}
                            onClick={() => setSubtitleModalEp({ epId: our.id, season: our.season ?? 0, episode: our.episode ?? 0 })}
                          />
                        )}

                        {/* Mark played / not played toggle */}
                        <Tooltip content={isPlayed ? 'Mark as not played' : 'Mark as played'}>
                          <button
                            onClick={() => handleTogglePlayed(our.id, mem?.duration, tmdbEp?.runtime)}
                            className="absolute bottom-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-colors hover:scale-110 z-10"
                          >
                            {isPlayed ? (
                              <FaCheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <FaRegCircleCheck className="w-5 h-5 text-white" />
                            )}
                          </button>
                        </Tooltip>
                      </div>

                      {/* Progress bar or spacer */}
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

                      {/* Episode details */}
                      <p className="text-xs text-gray-400 font-medium mb-0.5">
                        S{our.season ?? '?'} E{our.episode ?? '?'} - {tmdbEp?.name || our.episode_name || our.name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {tmdbEp?.air_date || ''}
                        {tmdbEp?.air_date && tmdbEp?.runtime ? ' · ' : ''}
                        {tmdbEp?.runtime ? formatDuration(tmdbEp.runtime) : ''}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                        {truncate(tmdbEp?.overview, 100)}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm mb-6">No episodes found for this season.</p>
            )}

            {/* Cast */}
            {tmdbData?.cast && tmdbData.cast.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-300 mb-2">Cast</h2>
                <div className="flex flex-wrap gap-4">
                  {tmdbData.cast.slice(0, 16).map((actor) => (
                    <div
                      key={actor.id}
                      onClick={() => setSelectedPersonId(actor.id)}
                      className="relative w-28 sm:w-32 h-40 sm:h-44 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 group cursor-pointer hover:brightness-90 transition"
                    >
                      {actor.profile_url ? (
                        <img
                          src={actor.profile_url}
                          alt={actor.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl font-bold">
                          {actor.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent backdrop-blur-sm py-2 px-2">
                        <p className="text-xs text-white font-semibold truncate">{actor.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{actor.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Crew */}
            {tmdbData?.crew && tmdbData.crew.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-300 mb-2">Crew</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {aggregateCrew(tmdbData.crew)
                    .slice(0, 40)
                    .map((member) => (
                      <div
                        key={member.id}
                        onClick={() => setSelectedPersonId(member.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-700/50 transition"
                      >
                        {member.profile_url ? (
                          <img
                            src={member.profile_url}
                            alt={member.name}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0 bg-gray-700"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-500 text-sm font-bold flex-shrink-0">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-white font-medium truncate">{member.name}</p>
                          <p className="text-[11px] text-gray-400 truncate">{member.jobs.join(', ')}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showTMDBModal && doc && (
          <TMDBMetadataModalTV
            docId={id!}
            docTitle={doc.series_name || doc.name || ''}
            onClose={() => setShowTMDBModal(false)}
            onLinked={() => {}}
          />
        )}

        {subtitleModalEp && tmdbData?.tmdb_id && (
          <SubtitleSearchModal
            docId={subtitleModalEp.epId}
            tmdbId={tmdbData.tmdb_id}
            season={subtitleModalEp.season}
            episode={subtitleModalEp.episode}
            onClose={() => setSubtitleModalEp(null)}
          />
        )}

        {showCollectionModal && id && (
          <AddToCollectionModal
            docId={id}
            type="series"
            onClose={() => setShowCollectionModal(false)}
          />
        )}
        {selectedPersonId && (
          <PersonModal
            personId={selectedPersonId}
            onClose={() => setSelectedPersonId(null)}
          />
        )}
      </div>
    </div>
  )
}

function EpisodeSubtitleIcon({ epId, onClick }: { epId: string; onClick: () => void }) {
  const { data: subtitle } = useEpisodeSubtitle(epId)
  const hasSubtitle = !!subtitle

  return (
    <Tooltip content={hasSubtitle ? 'View subtitles' : 'Search subtitles'}>
      <div className="absolute bottom-2 right-10 w-6 h-6 z-10">
        <button
          onClick={onClick}
          className="w-full h-full flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-colors hover:scale-110"
        >
          <MdOutlineSubtitles className="w-4 h-4 text-white" />
        </button>
        {hasSubtitle && (
          <FaCheckCircle className="absolute -top-0.5 -right-0.5 w-3 h-3 text-green-500 drop-shadow" />
        )}
      </div>
    </Tooltip>
  )
}
