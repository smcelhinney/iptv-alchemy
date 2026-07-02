import { apiClient } from './client'
import type { EmbyStatus } from '../../types/emby'

export async function addToEmby(docId: string, type: string, season?: number, episode?: number) {
  const payload: Record<string, unknown> = { id: docId, type }
  if (season !== undefined) payload.season = season
  if (episode !== undefined) payload.episode = episode
  const { data } = await apiClient.post('/emby/add', payload)
  return data
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

export async function syncMedia(): Promise<{ status: string; cleared_changes: number; refresh_results: { emby: boolean; jellyfin: boolean } }> {
  const { data } = await apiClient.post<{ status: string; cleared_changes: number; refresh_results: { emby: boolean; jellyfin: boolean } }>('/media/sync')
  return data
}

export async function discardSyncChanges(): Promise<{ status: string; discarded_changes: number }> {
  const { data } = await apiClient.post<{ status: string; discarded_changes: number }>('/media/sync/discard')
  return data
}
