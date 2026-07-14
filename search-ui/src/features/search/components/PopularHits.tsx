import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchBox } from 'react-instantsearch'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPopularMoviePage, fetchPopularTvPage } from '../../../lib/api'
import { proxyImageUrl } from '../../../lib/proxy'
import type { PopularItem } from '../../../lib/api'

interface PopularHitsProps {
  onSelect: (item: PopularItem) => void
}

function PopularSection({ title, color, fetchPage, queryKey, onSelect }: {
  title: string
  color: string
  fetchPage: (page: number, bypass?: boolean) => Promise<{ items: PopularItem[]; page: number; total_pages?: number }>
  queryKey: string
  onSelect: (item: PopularItem) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const [allItems, setAllItems] = useState<PopularItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const totalPagesRef = useRef(1)
  const [hasMore, setHasMore] = useState(true)
  const loadedPages = useRef(new Set<number>())

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [queryKey, currentPage],
    queryFn: () => fetchPage(currentPage),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!data) return
    if (loadedPages.current.has(currentPage)) return
    loadedPages.current.add(currentPage)
    setAllItems(prev => [...prev, ...data.items])
    const tp = data.total_pages ?? 1
    totalPagesRef.current = tp
    if (currentPage >= tp) setHasMore(false)
  }, [data, currentPage])

  const fetchNextPage = useCallback(() => {
    if (!hasMore || isFetching) return
    setCurrentPage(p => p + 1)
  }, [hasMore, isFetching])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const root = scrollRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage()
        }
      },
      { root, rootMargin: '100px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPage])

  const handleReset = () => {
    queryClient.removeQueries({ queryKey: [queryKey] })
    loadedPages.current.clear()
    setAllItems([])
    setCurrentPage(1)
    totalPagesRef.current = 1
    setHasMore(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
          <span className="text-sm text-gray-500">({allItems.length})</span>
        </div>
        {allItems.length > 10 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2"
      >
        {allItems.length === 0 && isLoading && (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="w-36 flex-shrink-0">
              <div className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse" />
              <div className="h-4 bg-gray-800 rounded mt-2 animate-pulse" />
              <div className="h-3 bg-gray-800 rounded mt-1 w-2/3 animate-pulse" />
            </div>
          ))
        )}
        {allItems.map((item, idx) => (
          <div
            key={`${item.type}-${item.tmdb_id}-${idx}`}
            className="w-36 flex-shrink-0 cursor-pointer group"
            onClick={() => onSelect(item)}
          >
            <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden relative">
              {item.poster_path ? (
                <img
                  src={proxyImageUrl(`https://image.tmdb.org/t/p/w342/${item.poster_path}`) ?? undefined}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                  No image
                </div>
              )}
              <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold rounded bg-black/60 text-yellow-400">
                {item.vote_average.toFixed(1)}
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-200 mt-2 truncate">{item.title}</h3>
            {item.year && <p className="text-xs text-gray-500">{item.year}</p>}
            <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded mt-1 inline-block ${color}`}>
              {title}
            </span>
          </div>
        ))}
        {allItems.length > 0 && hasMore && (
          <div ref={sentinelRef} className="w-10 flex-shrink-0 flex items-center justify-center">
            {isFetching ? (
              <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="w-1 h-1" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PopularHits({ onSelect }: PopularHitsProps) {
  const { query } = useSearchBox()

  const hasResults = query && query.trim().length > 0
  if (hasResults) return null

  return (
    <div className="space-y-6">
      <PopularSection
        title="Popular Movies"
        color="bg-blue-600"
        fetchPage={(page, bypass) => fetchPopularMoviePage(page, bypass)}
        queryKey="popular-movies"
        onSelect={onSelect}
      />
      <hr className="border-gray-700" />
      <PopularSection
        title="Popular TV"
        color="bg-purple-600"
        fetchPage={(page, bypass) => fetchPopularTvPage(page, bypass)}
        queryKey="popular-tv"
        onSelect={onSelect}
      />
    </div>
  )
}