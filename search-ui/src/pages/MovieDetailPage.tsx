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
import AddToCollectionModal from '../components/AddToCollectionModal'
import PersonModal from '../components/PersonModal'
import Tooltip from '../components/Tooltip'
import MovieHero from '../components/MovieHero'
import { aggregateCrew } from '../features/shared/utils'

interface MovieDoc {
  id: string
  name: string
  movie_name: string
  category: string
  logo: string
  url: string
  year?: number
}

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const queryClient = useQueryClient()
  const [embyLoading, setEmbyLoading] = useState(false)
  const [showTMDBModal, setShowTMDBModal] = useState(false)
  const [showSubtitleModal, setShowSubtitleModal] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)

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

  const backButton = (
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Movies
    </button>
  )

  const extraActions = (
    <>
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
    </>
  )

  const extraContent = subtitleData ? (
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
  ) : undefined

  return (
    <div className="flex-1 overflow-y-auto">
      {isLoading && <p className="text-gray-400 px-6 pt-[30px]">Loading...</p>}

      {doc && (
        <MovieHero
          doc={doc}
          tmdbData={tmdbData}
          progress={mem}
          onPlay={handlePlay}
          header={backButton}
          extraActions={extraActions}
          extraContent={extraContent}
        />
      )}

      {/* Metadata sections below backdrop */}
      {doc && (
        <div className="px-6 pb-6">
          {tmdbData && (
            <div className="space-y-6 mt-6">
              {/* Cast */}
              {tmdbData.cast && tmdbData.cast.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-300 mb-2">Cast</h2>
                  <div className="flex flex-wrap gap-4">
                    {tmdbData.cast.slice(0, 16).map((actor) => (
                      <button
                        type="button"
                        key={actor.id}
                        onClick={() => setSelectedPersonId(actor.id)}
                        className="relative w-28 sm:w-32 h-40 sm:h-44 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 group cursor-pointer hover:brightness-90 transition appearance-none bg-transparent p-0 m-0 text-left border border-gray-700/50 hover:border-gray-600"
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
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Crew */}
              {tmdbData.crew && tmdbData.crew.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-300 mb-2">Crew</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {aggregateCrew(tmdbData.crew)
                      .slice(0, 40)
                      .map((member) => (
                        <button
                          type="button"
                          key={member.id}
                          onClick={() => setSelectedPersonId(member.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-700/50 transition appearance-none bg-transparent text-left w-full border border-gray-700/50 hover:border-gray-600"
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
                        </button>
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

          {showCollectionModal && id && (
            <AddToCollectionModal
              docId={id}
              type="movies"
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
      )}
    </div>
  )
}
