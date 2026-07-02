import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  searchTMDB,
  getTMDBMovie,
  linkTMDBMovie,
  deleteTMDBMovieMetadata,
  searchTMDBTV,
  getTMDBSeries,
  linkTMDBSeries,
  deleteTMDBSeriesMetadata,
} from '../lib/api/tmdb-service'

// --- Movie hooks ---

export function useTMDBMovie(docId: string) {
  return useQuery({
    queryKey: ['tmdb', 'movie', docId],
    queryFn: () => getTMDBMovie(docId),
    enabled: !!docId,
    staleTime: 5 * 60_000,
  })
}

export function useSearchTMDB(query: string) {
  return useQuery({
    queryKey: ['tmdb', 'search', query],
    queryFn: () => searchTMDB(query),
    enabled: !!query && query.length >= 2,
    staleTime: 60_000,
  })
}

export function useLinkTMDBMovie(docId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tmdbId: number) => linkTMDBMovie(docId, tmdbId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tmdb', 'movie', docId] })
    },
  })
}

export function useDeleteTMDBMovie(docId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteTMDBMovieMetadata(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tmdb', 'movie', docId] })
    },
  })
}

// --- TV hooks ---

export function useTMDBSeries(docId: string) {
  return useQuery({
    queryKey: ['tmdb', 'series', docId],
    queryFn: () => getTMDBSeries(docId),
    enabled: !!docId,
    staleTime: 5 * 60_000,
  })
}

export function useSearchTMDBTV(query: string) {
  return useQuery({
    queryKey: ['tmdb', 'search-tv', query],
    queryFn: () => searchTMDBTV(query),
    enabled: !!query && query.length >= 2,
    staleTime: 60_000,
  })
}

export function useLinkTMDBSeries(docId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tmdbId: number) => linkTMDBSeries(docId, tmdbId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tmdb', 'series', docId] })
    },
  })
}

export function useDeleteTMDBSeries(docId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteTMDBSeriesMetadata(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tmdb', 'series', docId] })
    },
  })
}
