import { usePagination, useSearchBox } from 'react-instantsearch'

export default function Pagination() {
  const { query } = useSearchBox()
  const { currentRefinement, nbPages, refine, isFirstPage, isLastPage } = usePagination()

  // Don't show pagination when there's no query or only one page
  if (!query || nbPages <= 1) return null

  // Build a window of pages around the current page
  const getPageNumbers = () => {
    const maxVisible = 5
    let start = Math.max(0, currentRefinement - Math.floor(maxVisible / 2))
    const end = Math.min(nbPages - 1, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(0, end - maxVisible + 1)
    }

    const nums: number[] = []
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => refine(currentRefinement - 1)}
        disabled={isFirstPage}
        className="px-3 py-1.5 text-sm rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>

      {getPageNumbers().map((page) => (
        <button
          key={page}
          onClick={() => refine(page)}
          className={`w-9 h-9 text-sm rounded-md transition-colors ${
            page === currentRefinement
              ? 'bg-blue-600 text-white font-semibold'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {page + 1}
        </button>
      ))}

      <button
        onClick={() => refine(currentRefinement + 1)}
        disabled={isLastPage}
        className="px-3 py-1.5 text-sm rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </nav>
  )
}
