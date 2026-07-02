import { useQuery } from '@tanstack/react-query'
import { fetchDocument } from '../lib/api'
import { usePlaybackMemory } from './usePlaybackMemory'
import type { Episode } from '../types'

interface SeriesDoc {
  id: string
  episodes: Episode[]
}

export function useGetNextPlayableEpisode(seriesId: string | undefined) {
  const { data: doc, isLoading: docLoading } = useQuery({
    queryKey: ['document', seriesId],
    queryFn: () => fetchDocument<SeriesDoc>(seriesId!),
    enabled: !!seriesId,
  })

  const { data: playbackMemory, isLoading: memLoading } = usePlaybackMemory()

  const sortedEpisodes = doc?.episodes
    ? [...doc.episodes].sort((a, b) => {
        const seasonA = a.season ?? 0
        const seasonB = b.season ?? 0
        if (seasonA !== seasonB) return seasonA - seasonB
        return (a.episode ?? 0) - (b.episode ?? 0)
      })
    : []

  const nextEpisode = sortedEpisodes.find((ep) => {
    const mem = playbackMemory?.[ep.id]
    if (!mem || mem.currentTime <= 0 || mem.duration <= 0) return true // unplayed
    const progress = mem.currentTime / mem.duration
    return progress <= 0.98 // partially played
  })

  return {
    nextEpisode,
    isLoading: docLoading || memLoading,
    totalEpisodes: sortedEpisodes.length,
  }
}
