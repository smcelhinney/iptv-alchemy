import { apiClient } from './client'

export type CollectionType = 'movies' | 'series' | 'tv_channels'

export const COLLECTION_TYPE_ROUTE: Record<CollectionType, string> = {
  movies: 'movies',
  series: 'tv-shows',
  tv_channels: 'tv-channels',
}

export interface Collection {
  id: string
  name: string
  type: CollectionType
  count: number
}

export interface CollectionDetail {
  id: string
  name: string
  type: CollectionType
  items: string[]
}

export async function fetchCollections(type: CollectionType): Promise<Collection[]> {
  const { data } = await apiClient.get<Collection[]>('/collections', { params: { type } })
  return data
}

export async function createCollection(name: string, type: CollectionType): Promise<Collection> {
  const { data } = await apiClient.post<Collection>('/collections', { name, type })
  return data
}

export async function deleteCollection(id: string): Promise<void> {
  await apiClient.delete(`/collections/${id}`)
}

export async function fetchCollection(id: string): Promise<CollectionDetail> {
  const { data } = await apiClient.get<CollectionDetail>(`/collections/${id}`)
  return data
}

export async function addToCollection(colId: string, docId: string): Promise<void> {
  await apiClient.post(`/collections/${colId}/add`, { movie_id: docId })
}

export async function removeFromCollection(colId: string, docId: string): Promise<void> {
  await apiClient.post(`/collections/${colId}/remove`, { movie_id: docId })
}

export async function fetchDocCollections(docId: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`/collections/doc/${docId}`)
  return data
}
