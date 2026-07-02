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

export interface ListingHit {
  id: string
  title: string
  description: string
  channel_id: string
  channel_name: string
  channel_logo: string
  channel_url: string
  category: string
  start: string
  stop: string
  start_timestamp: number
  stop_timestamp: number
}

export type SearchCardItem = Hit | ListingHit
