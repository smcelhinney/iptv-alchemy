import axios from 'axios'
import type { ListingHit } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export const searchClient = axios.create({
  baseURL: API_BASE + '/search',
})

export const apiClient = axios.create({
  baseURL: API_BASE,
})

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

export async function addToEmby(docId: string, type: string, season?: number, episode?: number) {
  const payload: Record<string, unknown> = { id: docId, type }
  if (season !== undefined) payload.season = season
  if (episode !== undefined) payload.episode = episode
  const { data } = await apiClient.post('/emby/add', payload)
  return data
}

export interface SyncChange {
  action: 'add' | 'remove'
  type: 'series' | 'movie'
  name: string
  season?: number
  count?: number
}

export interface SyncStatus {
  pending_changes: number
  changes: SyncChange[]
}

export interface EmbyStatus {
  tv: Record<string, Record<string, string[]>>
  movies: string[]
  series_ids: string[]
  movie_ids: string[]
  sync_status: SyncStatus
}

export async function fetchEmbyStatus(): Promise<EmbyStatus> {
  const { data } = await apiClient.get<EmbyStatus>('/emby/status')
  return data
}

export async function removeFromEmby(
  extra: { type?: string; season?: number; episode?: number; series_name?: string; movie_name?: string },
) {
  const { data } = await apiClient.post('/emby/remove', extra)
  return data
}

export interface Task {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at: string
  started_at: string | null
  completed_at: string | null
  result: string | null
  error: string | null
  logs: string
}

export async function createTask(endpoint: string, body?: Record<string, unknown>): Promise<{ task_id: string }> {
  const { data } = await apiClient.post<{ task_id: string }>(endpoint, body)
  return data
}

export async function fetchTask(taskId: string): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/task/${taskId}`)
  return data
}

export async function fetchAllTasks(): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>('/tasks')
  return data
}

export async function syncMedia(): Promise<{ status: string; cleared_changes: number; refresh_results: { emby: boolean; jellyfin: boolean } }> {
  const { data } = await apiClient.post<{ status: string; cleared_changes: number; refresh_results: { emby: boolean; jellyfin: boolean } }>('/media/sync')
  return data
}

// --- Config API ---

export interface AppConfig {
  xtream_server_url: string
  xtream_username: string
  xtream_password: string
  emby_server_url: string
  emby_api_key: string
  jellyfin_server_url: string
  jellyfin_api_key: string
  exclude_categories: string
  [key: string]: string
}

export async function fetchConfig(): Promise<AppConfig> {
  const { data } = await apiClient.get<AppConfig>('/config')
  return data
}

export async function updateConfig(config: Partial<AppConfig>): Promise<{ status: string }> {
  const { data } = await apiClient.put<{ status: string }>('/config', config)
  return data
}

// --- Category API ---

export interface CategoriesResponse {
  categories: string[]
  selected: string[]
}

export async function fetchCategories(contentType: string): Promise<CategoriesResponse> {
  const { data } = await apiClient.get<CategoriesResponse>(`/categories/${contentType}`)
  return data
}

export async function updateSelectedCategories(
  contentType: string,
  categories: string[],
): Promise<{ status: string }> {
  const { data } = await apiClient.put<{ status: string }>(`/categories/${contentType}/selected`, {
    categories,
  })
  return data
}
