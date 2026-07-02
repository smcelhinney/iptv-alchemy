import { useHits, useSearchBox } from 'react-instantsearch'
import SearchCard from './SearchCard'
import type { SearchCardItem } from '../types'

interface HitsProps {
  onSelectHit: (hit: SearchCardItem) => void
}

export default function Hits({ onSelectHit }: HitsProps) {
  const { hits } = useHits<SearchCardItem>()
  const { query } = useSearchBox()

  // Zero state: no search query entered yet
  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg className="w-16 h-16 mb-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <p className="text-lg font-medium">Search for content</p>
        <p className="text-sm mt-1">Use the search box to find series, movies, and live TV</p>
      </div>
    )
  }

  // No results for the current query
  if (hits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg className="w-16 h-16 mb-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-lg font-medium">No results found</p>
        <p className="text-sm mt-1">Try adjusting your search terms or filters</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {hits.map((hit) => (
        <div key={hit.id} className="min-w-0 flex">
          <SearchCard hit={hit} onSelect={onSelectHit} />
        </div>
      ))}
    </div>
  )
}
