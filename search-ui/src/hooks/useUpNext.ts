import { useQuery } from '@tanstack/react-query'
import { fetchUpNext } from '../lib/api/up-next-service'

export function useUpNext() {
  return useQuery({
    queryKey: ['up-next'],
    queryFn: fetchUpNext,
    staleTime: 10_000,
  })
}
