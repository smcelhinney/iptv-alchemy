export type ContentType = 'series' | 'movie' | 'live_tv'

export interface Episode {
  id: string
  name: string
  url: string
  season?: number | null
  episode?: number | null
  episode_name: string
  full_episode_id?: string | null
  logo?: string
}

export interface Hit {
  id: string
  name?: string
  category?: string
  logo?: string
  url: string
  type: ContentType
  series_name?: string
  episode_name?: string
  season?: number
  episode?: number
  full_episode_id?: string
  movie_name?: string
  year?: number
  episodes?: Episode[]
  episode_count?: number
  __position?: number
}
