import { useState, useEffect, useCallback } from 'react'
import { useSearchTMDB, useLinkTMDBMovie } from '../hooks/useTMDB'
import type { TMDBSearchResult } from '../lib/api/tmdb-service'

interface TMDBMetadataModalProps {
  docId: string
  docTitle: string
  onClose: () => void
  onLinked: () => void
}

function stripYear(title: string): string {
  return title.replace(/\s*\(\d{4}\)\s*$/, '').trim()
}

export default function TMDBMetadataModal({ docId, docTitle, onClose, onLinked }: TMDBMetadataModalProps) {
  const cleanTitle = stripYear(docTitle)
  const [query, setQuery] = useState(cleanTitle)
  const [searchInput, setSearchInput] = useState(cleanTitle)

  const { data: results, isLoading, error } = useSearchTMDB(query)
  const linkMutation = useLinkTMDBMovie(docId)

  const handleSearch = useCallback(() => {
    setQuery(searchInput)
  }, [searchInput])

  const handleSelect = useCallback((result: TMDBSearchResult) => {
    linkMutation.mutate(result.id, {
      onSuccess: () => {
        onLinked()
        onClose()
      },
    })
  }, [linkMutation, onLinked, onClose])

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Link TMDB Metadata</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-5 border-b border-gray-700 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search TMDB..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching...
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">Error searching TMDB.</p>
          )}

          {!isLoading && !error && results && results.length === 0 && query && (
            <p className="text-gray-400 text-sm">No results found.</p>
          )}

          <div className="space-y-3">
            {results?.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                disabled={linkMutation.isPending}
                className="w-full flex items-start gap-4 p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors text-left disabled:opacity-50"
              >
                {result._poster_url ? (
                  <img
                    src={result._poster_url}
                    alt={result.title}
                    className="w-12 h-18 rounded object-cover bg-gray-700 flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-12 h-18 rounded bg-gray-700 flex items-center justify-center text-gray-500 text-xs flex-shrink-0">
                    No img
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{result.title}</h3>
                  {result.original_title && result.original_title !== result.title && (
                    <p className="text-xs text-gray-500 truncate">{result.original_title}</p>
                  )}
                  {result.release_date && (
                    <p className="text-xs text-gray-400">{result.release_date.split('-')[0]}</p>
                  )}
                  {result.overview && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{result.overview}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
