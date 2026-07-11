import { useQuery } from '@tanstack/react-query'
import { fetchPerson } from '../lib/api/person-service'

export function usePerson(personId: number | null) {
  return useQuery({
    queryKey: ['person', personId],
    queryFn: () => fetchPerson(personId!),
    enabled: !!personId,
    staleTime: Infinity,
  })
}
