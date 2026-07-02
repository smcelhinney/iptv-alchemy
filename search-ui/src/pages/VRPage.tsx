import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { fetchDocument } from '../lib/api'
import { useLibrary } from '../hooks/useLibrary'
import type { Hit } from '../types'
import VRScene from '../components/vr/VRScene'

export default function VRPage() {
  const { data: library, isLoading: libLoading, error: libError } = useLibrary()

  const movieIds = library?.movies ?? []
  const tvChannelIds = library?.tv_channels ?? []

  const movieDocs = useQueries({
    queries: movieIds.map((id) => ({
      queryKey: ['document', id],
      queryFn: () => fetchDocument<Hit>(id),
      staleTime: 60_000,
    })),
  })

  const channelDocs = useQueries({
    queries: tvChannelIds.map((id) => ({
      queryKey: ['document', id],
      queryFn: () => fetchDocument<Hit>(id),
      staleTime: 60_000,
    })),
  })

  const docsLoading = movieDocs.some((q) => q.isLoading) || channelDocs.some((q) => q.isLoading)
  const docsError = movieDocs.some((q) => q.error) || channelDocs.some((q) => q.error)

  const favourites = useMemo(() => {
    const movies: Hit[] = movieDocs
      .map((q) => q.data)
      .filter((d): d is Hit => d !== undefined)
    const tv_channels: Hit[] = channelDocs
      .map((q) => q.data)
      .filter((d): d is Hit => d !== undefined)
    return { movies, tv_channels }
  }, [movieDocs, channelDocs])

  if (libLoading || docsLoading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading library...
        </div>
      </div>
    )
  }

  if (libError || docsError) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400 text-sm">
          Failed to load library.
        </div>
      </div>
    )
  }

  return <VRScene favourites={favourites} />
}
