import type { ContentType } from '../../../types'

export const TYPE_COLORS: Record<ContentType | 'listing', string> = {
  series: 'bg-purple-600',
  movie: 'bg-blue-600',
  live_tv: 'bg-green-600',
  listing: 'bg-orange-600',
}

export const TYPE_LABELS: Record<ContentType | 'listing', string> = {
  series: 'Series',
  movie: 'Movie',
  live_tv: 'TV Channels',
  listing: 'Listing',
}
