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
