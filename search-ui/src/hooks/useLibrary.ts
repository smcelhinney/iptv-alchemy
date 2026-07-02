import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchLibrary, addToLibrary, removeFromLibrary, fetchAddedTimes } from '../lib/api/library-service'

export function useLibrary() {
  return useQuery({
    queryKey: ['library'],
    queryFn: fetchLibrary,
    staleTime: 30_000,
  })
}

export function useLibraryIds(): { movies: Set<string>; series: Set<string>; tv_channels: Set<string> } {
  const { data } = useLibrary()
  return useMemo(() => {
    const movies = new Set(data?.movies ?? [])
    const series = new Set(data?.series ?? [])
    const tv_channels = new Set(data?.tv_channels ?? [])
    return { movies, series, tv_channels }
  }, [data])
}

export function useAddToLibrary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) =>
      addToLibrary(type, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library'] })
    },
  })
}

export function useRemoveFromLibrary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) =>
      removeFromLibrary(type, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library'] })
    },
  })
}

export function useAddedTimes() {
  return useQuery({
    queryKey: ['library-added-times'],
    queryFn: fetchAddedTimes,
    staleTime: 10_000,
  })
}
