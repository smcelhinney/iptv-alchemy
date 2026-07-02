import { apiClient } from './client'

export interface PlaybackMemoryEntry {
  id: string
  currentTime: number
  duration: number
  updatedAt: number
}

export async function fetchPlaybackMemory(): Promise<Record<string, PlaybackMemoryEntry>> {
  const { data } = await apiClient.get<Record<string, PlaybackMemoryEntry>>('/playback/memory')
  return data
}

export async function savePlaybackMemory(id: string, currentTime: number, duration: number): Promise<void> {
  await apiClient.put('/playback/memory', { id, currentTime, duration })
}

export async function deletePlaybackMemory(id: string): Promise<void> {
  await apiClient.delete(`/playback/memory/${id}`)
}

export async function fetchAllLastPlayed(): Promise<Record<string, string>> {
  const { data } = await apiClient.get<Record<string, string>>('/playback/last-played')
  return data
}
