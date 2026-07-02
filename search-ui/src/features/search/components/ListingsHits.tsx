import { useSearchBox } from 'react-instantsearch'
import { useQuery } from '@tanstack/react-query'
import { searchListings } from '../../../lib/api'
import type { SearchCardItem } from '../../../types'
import SearchCard from '../../../components/SearchCard'

interface ListingsHitsProps {
  onSelectListing: (hit: SearchCardItem) => void
}

export default function ListingsHits({ onSelectListing }: ListingsHitsProps) {
  const { query } = useSearchBox()

  const { data: listings, isLoading } = useQuery({
    queryKey: ['listings', query],
    queryFn: () => searchListings(query, 10),
    staleTime: 5000,
  })

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-200">TV Listings</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-80 flex-shrink-0 h-28 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!listings || listings.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-200">TV Listings</h2>
        <span className="text-sm text-gray-500">({listings.length} upcoming)</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
        {listings.map((hit) => (
          <div key={hit.id} className="w-80 flex-shrink-0">
            <SearchCard hit={hit} onSelect={onSelectListing} />
          </div>
        ))}
      </div>
    </div>
  )
}
