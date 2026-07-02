import { useEffect } from 'react'
import { useSearchSubtitles, useLinkSubtitle, useLinkEpisodeSubtitle } from '../hooks/useSubtitles'
import type { SubtitleSearchResult } from '../lib/api/subtitle-service'

interface SubtitleSearchModalProps {
  docId: string
  tmdbId: number
  season?: number
  episode?: number
  onClose: () => void
}

export default function SubtitleSearchModal({ docId, tmdbId, season, episode, onClose }: SubtitleSearchModalProps) {
  const isEpisode = season !== undefined && episode !== undefined
  const { data: results, isLoading, error } = useSearchSubtitles(tmdbId, season, episode)
  const movieLinkMutation = useLinkSubtitle(docId)
  const episodeLinkMutation = useLinkEpisodeSubtitle(docId)
  const linkMutation = isEpisode ? episodeLinkMutation : movieLinkMutation

  const handleSelect = (result: SubtitleSearchResult) => {
    linkMutation.mutate(
      { fileId: result.file_id, release: result.release },
      {
        onSuccess: () => {
          onClose()
        },
      }
    )
  }

  const linkError = linkMutation.error as any

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

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
        <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Search Subtitles</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching OpenSubtitles...
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm space-y-1">
              <p>Error searching subtitles.</p>
              <p className="text-xs text-red-300">{error instanceof Error ? error.message : String(error)}</p>
            </div>
          )}

          {linkError && (
            <div className="text-red-400 text-sm space-y-1">
              <p>Error downloading subtitle.</p>
              <p className="text-xs text-red-300">{linkError.response?.data?.error || linkError.message || String(linkError)}</p>
            </div>
          )}

          {!isLoading && !error && results && results.length === 0 && (
            <p className="text-gray-400 text-sm">No English subtitles found.</p>
          )}

          <div className="space-y-2">
            {results?.map((result) => (
              <button
                key={result.file_id}
                onClick={() => handleSelect(result)}
                disabled={linkMutation.isPending}
                className="w-full flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors text-left disabled:opacity-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{result.release || 'Subtitle'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {result.hi && <span className="text-yellow-500 mr-2">HI</span>}
                    {result.hd && <span className="text-blue-400 mr-2">HD</span>}
                    {result.fps ? <span className="mr-2">{result.fps.toFixed(2)} fps</span> : null}
                    <span>{result.download_count.toLocaleString()} downloads</span>
                    {result.votes > 0 && <span className="ml-2">{result.votes} votes</span>}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 12l-4-4m4 4l4-4M4 20h16" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
