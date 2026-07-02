import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  searchSubtitles,
  getMovieSubtitle,
  linkSubtitle,
  deleteSubtitle,
  getEpisodeSubtitle,
  linkEpisodeSubtitle,
  deleteEpisodeSubtitle,
} from '../lib/api/subtitle-service'

export function useSearchSubtitles(tmdbId: number | undefined, season?: number, episode?: number) {
  return useQuery({
    queryKey: ['subtitles', 'search', tmdbId, season, episode],
    queryFn: () => searchSubtitles(tmdbId!, season, episode),
    enabled: !!tmdbId,
    staleTime: 5 * 60_000,
  })
}

export function useMovieSubtitle(docId: string) {
  return useQuery({
    queryKey: ['subtitles', 'movie', docId],
    queryFn: () => getMovieSubtitle(docId),
    enabled: !!docId,
    staleTime: 5 * 60_000,
  })
}

export function useLinkSubtitle(docId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fileId, release }: { fileId: number; release: string }) =>
      linkSubtitle(docId, fileId, release),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subtitles', 'movie', docId] })
    },
  })
}

export function useDeleteSubtitle(docId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteSubtitle(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subtitles', 'movie', docId] })
    },
  })
}

export function useEpisodeSubtitle(epId: string) {
  return useQuery({
    queryKey: ['subtitles', 'episode', epId],
    queryFn: () => getEpisodeSubtitle(epId),
    enabled: !!epId,
    staleTime: 5 * 60_000,
  })
}

export function useLinkEpisodeSubtitle(epId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fileId, release }: { fileId: number; release: string }) =>
      linkEpisodeSubtitle(epId, fileId, release),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subtitles', 'episode', epId] })
    },
  })
}

export function useDeleteEpisodeSubtitle(epId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteEpisodeSubtitle(epId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subtitles', 'episode', epId] })
    },
  })
}
