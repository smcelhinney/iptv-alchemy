import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchBox } from 'react-instantsearch'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPopularMoviePage, fetchPopularTvPage, clearPopularCache } from '../../../lib/api'
import { proxyImageUrl } from '../../../lib/proxy'
import type { PopularItem } from '../../../lib/api'

interface PopularHitsProps {
  onSelect: (item: PopularItem) => void
}

function PopularSection({ title, color, fetchPage, queryKey, onSelect, type }: {
  title: string
  color: string
  fetchPage: (page: number, bypass?: boolean) => Promise<{ items: PopularItem[]; page: number; total_pages?: number }>
  queryKey: string
  onSelect: (item: PopularItem) => void
  type: 'movie' | 'tv'
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const observerRef = useRef<IntersectionObserver | null>(null)

  const [allItems, setAllItems] = useState<PopularItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const totalPagesRef = useRef(1)
  const [hasMore, setHasMore] = useState(true)
  const loadedPages = useRef(new Set<number>())
  const bypassRef = useRef(false)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [queryKey, currentPage],
    queryFn: () => {
      const bypass = bypassRef.current
      bypassRef.current = false
      return fetchPage(currentPage, bypass)
    },
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

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      if (!node || !scrollRef.current) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            fetchNextPage()
          }
        },
        { root: scrollRef.current, rootMargin: '100px' },
      )
      observer.observe(node)
      observerRef.current = observer
    },
    [fetchNextPage],
  )

  const handleClear = async () => {
    queryClient.removeQueries({ queryKey: [queryKey] })
    loadedPages.current.clear()
    setAllItems([])
    setCurrentPage(1)
    totalPagesRef.current = 1
    setHasMore(true)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_API_CACHE',
        pattern: `/api/populate/${type === 'movie' ? 'movie' : 'tv'}`,
      })
    }
    await clearPopularCache(type)
    bypassRef.current = true
    setCurrentPage(1)
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
            onClick={handleClear}
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
                {(item.vote_average ?? 0).toFixed(1)}
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
        type="movie"
      />
      <hr className="border-gray-700" />
      <PopularSection
        title="Popular TV"
        color="bg-purple-600"
        fetchPage={(page, bypass) => fetchPopularTvPage(page, bypass)}
        queryKey="popular-tv"
        onSelect={onSelect}
        type="tv"
      />
    </div>
  )
}