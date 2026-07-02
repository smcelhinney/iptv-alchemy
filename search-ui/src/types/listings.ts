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

export type SearchCardItem = import('./content').Hit | ListingHit
