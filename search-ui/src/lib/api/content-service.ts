import { apiClient, searchClient } from './client'
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

export interface PopularItem {
  tmdb_id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  year: number | null;
  type: 'movie' | 'tv';
}

export interface PopularPageResponse {
  items: PopularItem[];
  page: number;
  total_pages?: number;
  from_cache?: boolean;
}

export async function fetchPopularMoviePage(page = 1, bypassCache = false): Promise<PopularPageResponse> {
  const { data } = await apiClient.post<PopularPageResponse>('/populate/movie', { page, bypass_cache: bypassCache })
  return data
}

export async function fetchPopularTvPage(page = 1, bypassCache = false): Promise<PopularPageResponse> {
  const { data } = await apiClient.post<PopularPageResponse>('/populate/tv', { page, bypass_cache: bypassCache })
  return data
}
