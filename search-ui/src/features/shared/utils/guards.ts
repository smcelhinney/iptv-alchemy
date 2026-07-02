import type { SearchCardItem } from '../../../types'
import type { ListingHit } from '../../../types/listings'

/**
 * Type guard to check if a SearchCardItem is a ListingHit.
 */
export function isListingHit(hit: SearchCardItem): hit is ListingHit {
  return 'channel_id' in hit
}

/**
 * Checks if a TV programme is currently airing based on start/stop timestamps.
 */
export function isOnNow(startTimestamp: number, stopTimestamp: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  return now >= startTimestamp && now < stopTimestamp
}
