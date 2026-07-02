import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchPlaybackMemory,
  savePlaybackMemory,
  deletePlaybackMemory,
  fetchAllLastPlayed,
} from '../lib/api/playback-memory-service'

export function usePlaybackMemory() {
  return useQuery({
    queryKey: ['playback-memory'],
    queryFn: fetchPlaybackMemory,
    staleTime: 10_000,
  })
}

export function useSavePlaybackMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, currentTime, duration }: { id: string; currentTime: number; duration: number }) =>
      savePlaybackMemory(id, currentTime, duration),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playback-memory'] })
    },
  })
}

export function useDeletePlaybackMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePlaybackMemory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playback-memory'] })
    },
  })
}

export function useLastPlayed() {
  return useQuery({
    queryKey: ['last-played'],
    queryFn: fetchAllLastPlayed,
    staleTime: 10_000,
  })
}
