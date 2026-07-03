import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { VscSync, VscSyncIgnored } from 'react-icons/vsc'
import { FaRegCircleCheck } from 'react-icons/fa6'
import { FaCheckCircle } from 'react-icons/fa'
import { fetchDocument, fetchEmbyStatus, fetchConfig, addToEmby, removeFromEmby } from '../lib/api'
import { usePlaybackMemory, useSavePlaybackMemory, useDeletePlaybackMemory } from '../hooks/usePlaybackMemory'
import { useRemoveFromLibrary } from '../hooks/useLibrary'
import { useTMDBMovie } from '../hooks/useTMDB'
import { useMovieSubtitle, useDeleteSubtitle } from '../hooks/useSubtitles'
import { usePlayerStore } from '../stores/playerStore'
import TMDBMetadataModal from '../components/TMDBMetadataModal'
import MenuDropdown from '../components/MenuDropdown'
import SubtitleSearchModal from '../components/SubtitleSearchModal'
import Tooltip from '../components/Tooltip'

interface MovieDoc {
  id: string
  name: string
  movie_name: string
  category: string
  logo: string
  url: string
  year?: number
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const queryClient = useQueryClient()
  const [embyLoading, setEmbyLoading] = useState(false)
  const [showTMDBModal, setShowTMDBModal] = useState(false)
  const [showSubtitleModal, setShowSubtitleModal] = useState(false)

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument<MovieDoc>(id!),
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
  const { data: tmdbData, isLoading: tmdbLoading } = useTMDBMovie(id ?? '')

  const hasTmdbKey = (config?.tmdb_api_key ?? '') !== ''
  const hasOpenSubtitlesCreds =
    (config?.opensubtitles_api_key ?? '') !== '' &&
    (config?.opensubtitles_username ?? '') !== '' &&
    (config?.opensubtitles_password ?? '') !== ''

  const inEmby = id ? embyStatus?.movie_ids?.includes(id) ?? false : false
  const mem = id && playbackMemory ? playbackMemory[id] : undefined
  const hasProgress = mem && mem.currentTime > 0
  const isPlayed = mem && mem.duration > 0 && (mem.currentTime / mem.duration) >= 0.98

  const savePlayback = useSavePlaybackMemory()
  const deletePlayback = useDeletePlaybackMemory()
  const { data: subtitleData } = useMovieSubtitle(id ?? '')
  const deleteSubtitle = useDeleteSubtitle(id ?? '')

  const handlePlay = (fromStart = false) => {
    if (!doc?.url) return
    if (fromStart && id) {
      deletePlayback.mutate(id)
    }
    const initialTime = fromStart ? undefined : (mem && mem.currentTime > 0 ? mem.currentTime : undefined)
    openPlayer(doc.url, doc.movie_name || doc.name || 'Unknown', 'vod', {
      savePlaybackId: id,
      initialTime,
    })
  }

  const handleSyncToEmby = async () => {
    if (!id) return
    setEmbyLoading(true)
    await addToEmby(id, 'movie')
    queryClient.refetchQueries({ queryKey: ['emby-status'] })
    setEmbyLoading(false)
  }

  const handleRemoveFromEmby = async () => {
    if (!id) return
    setEmbyLoading(true)
    await removeFromEmby({ type: 'movie', movie_name: doc?.movie_name || doc?.name })
    queryClient.refetchQueries({ queryKey: ['emby-status'] })
    setEmbyLoading(false)
  }

  const removeFromLibrary = useRemoveFromLibrary()

  const handleRemoveFromLibrary = () => {
    removeFromLibrary.mutate({ type: 'movies', id: id! }, {
      onSuccess: () => navigate('/library/movies'),
    })
  }

  const handleTogglePlayed = () => {
    if (!id) return
    if (isPlayed) {
      deletePlayback.mutate(id)
    } else {
      const duration = mem?.duration || (tmdbData?.runtime ? tmdbData.runtime * 60 : 7200)
      savePlayback.mutate({ id, currentTime: duration, duration })
    }
  }

  const handleDisableSubtitle = () => {
    if (!id) return
    deleteSubtitle.mutate()
  }

  const year = tmdbData?.release_date?.split('-')[0] || doc?.year
  const runtime = tmdbData?.runtime
  const genres = tmdbData?.genres ?? []
  const rating = tmdbData?.vote_average

  const progressPercent = mem && mem.duration > 0
    ? Math.min(100, (mem.currentTime / mem.duration) * 100)
    : 0

  const remainingSeconds = mem && mem.duration > 0
    ? Math.max(0, mem.duration - mem.currentTime)
    : 0
  const remainingMinutes = Math.floor(remainingSeconds / 60)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Sticky backdrop */}
      {tmdbData?.backdrop_url && (
        <div className="sticky top-0 w-full h-[28rem] overflow-hidden">
          <img
            src={tmdbData.backdrop_url}
            alt={tmdbData.title || doc?.movie_name || doc?.name || ''}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/40 to-gray-900" />
        </div>
      )}

      {/* Content */}
      <div className={`relative z-10 px-6 pb-6 ${tmdbData?.backdrop_url ? '-mt-[28rem] pt-[30px]' : 'pt-[30px]'}`}>
        <button
          onClick={() => navigate('/library/movies')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Movies
        </button>

        {isLoading && <p className="text-gray-400">Loading...</p>}

        {doc && (
          <div>
            {/* Detail panel */}
            <div className="flex gap-6 mb-4">
            {/* Left: Thumbnail */}
            {tmdbData?.poster_url || doc.logo ? (
              <img
                src={tmdbData?.poster_url || doc.logo}
                alt={doc.movie_name || doc.name}
                className="hidden lg:block w-[350px] h-[490px] rounded-lg object-cover bg-gray-800 flex-shrink-0"
              />
            ) : (
              <div className="hidden lg:block w-[350px] h-[490px] rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-sm flex-shrink-0">
                No image
              </div>
            )}

              {/* Right: Info + Controls */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Title */}
                <h1 className="text-2xl font-bold text-white mb-1 truncate">
                  {tmdbData?.title || doc.movie_name || doc.name}
                </h1>

                {/* Info row */}
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

                {/* Controls row */}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {hasProgress && !isPlayed ? (
                    <>
                      <button
                        onClick={() => handlePlay(false)}
                        className="flex items-center gap-1.5 h-9 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                        Resume
                      </button>
                      <button
                        onClick={() => handlePlay(true)}
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
                      onClick={() => handlePlay(true)}
                      className="flex items-center gap-1.5 h-9 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                      </svg>
                      Start from Beginning
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePlay(false)}
                      className="flex items-center gap-1.5 h-9 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                      Play
                    </button>
                  )}

                  {/* Mark as played */}
                  <Tooltip content={isPlayed ? 'Mark as unplayed' : 'Mark as played'}>
                    <button
                      onClick={handleTogglePlayed}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                      {isPlayed ? (
                        <FaCheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <FaRegCircleCheck className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </Tooltip>

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
                    <Tooltip content={inEmby ? 'Unsync from media server' : 'Sync to media server'}>
                      <button
                        onClick={inEmby ? handleRemoveFromEmby : handleSyncToEmby}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                      >
                        {inEmby ? (
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

                  {/* More dropdown */}
                  <MenuDropdown
                    trigger={
                      <Tooltip content="More options">
                        <button
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                        >
                          ...
                        </button>
                      </Tooltip>
                    }
                    items={[
                      ...(tmdbData?.tmdb_id && hasOpenSubtitlesCreds
                        ? [
                            {
                              label: 'Search subtitles',
                              onClick: () => setShowSubtitleModal(true),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>

                {/* Subtitle status */}
                {subtitleData && (
                  <div className="mt-3 flex items-center gap-2 max-w-md">
                    <span className="text-xs text-gray-400 truncate">
                      Subtitle: {subtitleData.release || 'Unknown'}
                    </span>
                    <Tooltip content="Remove subtitle">
                      <button
                        onClick={handleDisableSubtitle}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                )}

                {/* Progress bar — below controls */}
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

                {tmdbData?.tagline && (
                  <h2 className="text-base font-semibold text-white mb-1 mt-4">{tmdbData.tagline}</h2>
                )}

                {tmdbData?.overview && (
                  <p className="text-sm text-gray-300 leading-relaxed">{tmdbData.overview}</p>
                )}

                {/* Director */}
                {tmdbData?.director && (
                  <p className="text-sm text-gray-400 italic mt-3">Directed by {tmdbData.director}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Metadata sections below backdrop */}
        {doc && (
          <div>
            {tmdbData && (
              <div className="space-y-6 mt-6">
                {/* Cast */}
                {tmdbData.cast && tmdbData.cast.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-300 mb-2">Cast</h2>
                    <div className="flex flex-wrap gap-4">
                      {tmdbData.cast.slice(0, 16).map((actor) => (
                        <div
                          key={actor.id}
                          className="relative w-28 sm:w-32 h-40 sm:h-44 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 group"
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
                          {/* Bottom glass overlay */}
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
                {tmdbData.crew && tmdbData.crew.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-300 mb-2">Crew</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {[...tmdbData.crew]
                        .sort((a, b) => {
                          const priority = (job: string) =>
                            job === 'Director' ? 0 :
                            job === 'Producer' ? 1 : 2
                          return priority(a.job) - priority(b.job)
                        })
                        .slice(0, 40)
                        .map((member, i) => (
                          <div key={`${member.id}-${i}`} className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
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
                              <p className="text-[11px] text-gray-400 truncate">{member.job}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Studios */}
                {tmdbData.production_companies && tmdbData.production_companies.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-300 mb-2">Studios</h2>
                    <div className="flex flex-wrap gap-2">
                      {tmdbData.production_companies.map((c) => (
                        <span key={c.name} className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded border border-gray-700">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Countries */}
                {tmdbData.production_countries && tmdbData.production_countries.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-300 mb-2">Production Countries</h2>
                    <div className="flex flex-wrap gap-2">
                      {tmdbData.production_countries.map((c) => (
                        <span key={c} className="text-xs text-gray-400">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showTMDBModal && (
              <TMDBMetadataModal
                docId={id!}
                docTitle={doc.movie_name || doc.name || ''}
                onClose={() => setShowTMDBModal(false)}
                onLinked={() => {}}
              />
            )}

            {showSubtitleModal && tmdbData?.tmdb_id && (
              <SubtitleSearchModal
                docId={id!}
                tmdbId={tmdbData.tmdb_id}
                onClose={() => setShowSubtitleModal(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
