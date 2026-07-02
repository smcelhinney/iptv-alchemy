import { apiClient } from './client'

export interface LibraryResponse {
  movies: string[]
  series: string[]
  tv_channels: string[]
}

export async function fetchLibrary(): Promise<LibraryResponse> {
  const { data } = await apiClient.get<LibraryResponse>('/library')
  return data
}

export async function addToLibrary(type: string, id: string): Promise<void> {
  await apiClient.post('/library/add', { type, id })
}

export async function removeFromLibrary(type: string, id: string): Promise<void> {
  await apiClient.delete(`/library/${type}/${id}`)
}

export async function fetchAddedTimes(): Promise<Record<string, string>> {
  const { data } = await apiClient.get<Record<string, string>>('/library/added-times')
  return data
}
