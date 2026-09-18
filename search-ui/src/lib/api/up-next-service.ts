import { apiClient } from './client'

export interface UpNextProgress {
  currentTime: number
  duration: number
}

export interface UpNextMovie {
  type: 'movie'
  id: string
  doc: Record<string, unknown>
  progress: UpNextProgress
  lastPlayed: number
}

export interface UpNextEpisode {
  id: string
  name: string
  episode_name: string
  season?: number | null
  episode?: number | null
  url?: string
  logo?: string
}

export interface UpNextSeries {
  type: 'series'
  id: string
  doc: Record<string, unknown>
  episode: UpNextEpisode
  progress: UpNextProgress
  lastPlayed: number
}

export type UpNextItem = UpNextMovie | UpNextSeries

export async function fetchUpNext(): Promise<UpNextItem | null> {
  const { data } = await apiClient.get<UpNextItem | null>('/up-next')
  return data
}
