import { useNavigate } from 'react-router-dom'
import { useUpNext } from '../../../hooks/useUpNext'
import { useTMDBMovie, useTMDBSeries } from '../../../hooks/useTMDB'
import { usePlayerStore } from '../../../stores/playerStore'
import MovieHero, { type MovieDoc } from '../../../components/MovieHero'
import ShowHero, { type SeriesDoc } from '../../../components/ShowHero'
import UpNextEpisodeTile from '../../../components/UpNextEpisodeTile'
import type { UpNextMovie, UpNextSeries } from '../../../lib/api/up-next-service'
import type { TMDBEpisode } from '../../../lib/api/tmdb-service'
import type { Episode } from '../../../types'

function UpNextSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-200">Up next</h2>
      </div>
      <div className="w-full h-64 bg-gray-800 rounded-lg animate-pulse" />
    </div>
  )
}

function UpNextMovieItem({ item }: { item: UpNextMovie }) {
  const navigate = useNavigate()
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const { data: tmdbData } = useTMDBMovie(item.id)
  const doc = item.doc as unknown as MovieDoc

  const handlePlay = (fromStart: boolean) => {
    if (!doc.url) return
    openPlayer(doc.url, doc.movie_name || doc.name || 'Unknown', 'vod', {
      savePlaybackId: item.id,
      initialTime: fromStart ? undefined : item.progress.currentTime,
    })
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-200">Up next</h2>
      </div>
      <div
        onClick={() => navigate(`/library/movies/${item.id}`)}
        className="cursor-pointer rounded-lg overflow-hidden bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors"
      >
        <MovieHero
          doc={doc}
          tmdbData={tmdbData}
          progress={item.progress}
          compact
          onPlay={handlePlay}
        />
      </div>
    </div>
  )
}

function UpNextSeriesItem({ item }: { item: UpNextSeries }) {
  const navigate = useNavigate()
  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const { data: tmdbData } = useTMDBSeries(item.id)
  const doc = item.doc as unknown as SeriesDoc

  const seriesName = doc.series_name || doc.name || 'Unknown'

  const tmdbEpisode = tmdbData?.seasons
    ?.flatMap((s) => s.episodes)
    ?.find(
      (e) =>
        e.season_number === item.episode.season &&
        e.episode_number === item.episode.episode
    ) as TMDBEpisode | undefined

  const episode = item.episode as unknown as Episode

  const handlePlayEpisode = () => {
    if (!episode.url) return
    const epTitle =
      tmdbEpisode?.name || episode.episode_name || episode.name
    const displayTitle = `${seriesName} - S${episode.season ?? '?'}E${episode.episode ?? '?'} - ${epTitle}`
    openPlayer(episode.url, displayTitle, 'vod', {
      savePlaybackId: episode.id,
      initialTime: item.progress.currentTime,
    })
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-200">Up next</h2>
      </div>
      <div
        onClick={() => navigate(`/library/tv-shows/${item.id}`)}
        className="cursor-pointer rounded-lg overflow-hidden bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors"
      >
        <ShowHero doc={doc} tmdbData={tmdbData} compact />
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-400 mb-2">Continue watching</p>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
          <UpNextEpisodeTile
            episode={episode}
            tmdbEpisode={tmdbEpisode}
            progress={item.progress}
            onPlay={handlePlayEpisode}
          />
        </div>
      </div>
    </div>
  )
}

export default function UpNextSection() {
  const { data: item, isLoading } = useUpNext()

  if (isLoading) {
    return <UpNextSkeleton />
  }

  if (!item) {
    return null
  }

  if (item.type === 'movie') {
    return <UpNextMovieItem item={item} />
  }

  return <UpNextSeriesItem item={item} />
}
