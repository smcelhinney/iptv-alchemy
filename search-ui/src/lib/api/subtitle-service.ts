import { apiClient } from './client'

export interface SubtitleSearchResult {
  file_id: number
  language: string
  release: string
  hi: boolean
  fps: number | null
  hd: boolean
  download_count: number
  votes: number
}

export interface SubtitleMetadata {
  file_id: number
  language: string
  release: string
  vtt: string
}

export async function searchSubtitles(tmdbId: number, season?: number, episode?: number): Promise<SubtitleSearchResult[]> {
  const params: Record<string, number> = { tmdb_id: tmdbId }
  if (season !== undefined) params.season = season
  if (episode !== undefined) params.episode = episode
  const { data } = await apiClient.get<{ results: SubtitleSearchResult[] }>('/subtitles/search', {
    params,
  })
  return data.results
}

export async function getMovieSubtitle(docId: string): Promise<SubtitleMetadata | null> {
  try {
    const { data } = await apiClient.get<SubtitleMetadata>(`/subtitles/movie/${docId}`)
    return data
  } catch (error: any) {
    if (error.response?.status === 404) return null
    throw error
  }
}

export async function linkSubtitle(docId: string, fileId: number, release: string): Promise<SubtitleMetadata> {
  const { data } = await apiClient.post<SubtitleMetadata>(`/subtitles/movie/${docId}/link`, {
    file_id: fileId,
    release,
  })
  return data
}

export async function deleteSubtitle(docId: string): Promise<void> {
  await apiClient.delete(`/subtitles/movie/${docId}`)
}

export async function getEpisodeSubtitle(epId: string): Promise<SubtitleMetadata | null> {
  try {
    const { data } = await apiClient.get<SubtitleMetadata>(`/subtitles/episode/${epId}`)
    return data
  } catch (error: any) {
    if (error.response?.status === 404) return null
    throw error
  }
}

export async function linkEpisodeSubtitle(epId: string, fileId: number, release: string): Promise<SubtitleMetadata> {
  const { data } = await apiClient.post<SubtitleMetadata>(`/subtitles/episode/${epId}/link`, {
    file_id: fileId,
    release,
  })
  return data
}

export async function deleteEpisodeSubtitle(epId: string): Promise<void> {
  await apiClient.delete(`/subtitles/episode/${epId}`)
}

export function getEpisodeSubtitleVttUrl(epId: string): string {
  return `/api/subtitles/episode/${epId}/vtt`
}

export function getSubtitleVttUrl(docId: string): string {
  return `/api/subtitles/movie/${docId}/vtt`
}
