import { searchClient } from './client'
import type { ListingHit } from '../../types/listings'

export async function searchListings(query: string, limit: number = 3): Promise<ListingHit[]> {
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600
  const { data } = await searchClient.post('/multi-search', {
    queries: [
      {
        indexUid: 'iptv_listings',
        q: query || '',
        limit,
        sort: ['start_timestamp:asc'],
        filter: `stop_timestamp > ${oneHourAgo}`,
      },
    ],
  })
  return data.results[0].hits
}

export async function fetchDocument<T = Record<string, unknown>>(docId: string): Promise<T> {
  const { data } = await searchClient.get<T>(`/result/${encodeURIComponent(docId)}`)
  return data
}
