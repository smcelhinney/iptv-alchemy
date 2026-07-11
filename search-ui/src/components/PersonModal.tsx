import { useEffect, useMemo, useState } from 'react'
import { usePerson } from '../hooks/usePerson'
import { aggregatePersonCredits } from '../lib/api/person-service'

interface PersonModalProps {
  personId: number
  onClose: () => void
}

function formatLocaleDate(dateString: string): string {
  if (!dateString) return dateString
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  try {
    return new Intl.DateTimeFormat(navigator.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  } catch {
    return dateString
  }
}

export default function PersonModal({ personId, onClose }: PersonModalProps) {
  const { data: person, isLoading, error } = usePerson(personId)
  const [bioExpanded, setBioExpanded] = useState(false)
  const aggregatedCredits = useMemo(
    () => (person ? aggregatePersonCredits(person.credits) : []),
    [person],
  )

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-white truncate">
            {isLoading ? 'Loading...' : person?.name || 'Person'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-12">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading person details...
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center py-12">Failed to load person details.</p>
          )}

          {!isLoading && !error && person && (
            <div className="space-y-6">
              {/* Header info */}
              <div className="flex gap-4">
                {person.profile_url ? (
                  <img
                    src={person.profile_url}
                    alt={person.name}
                    className="w-24 h-36 rounded-lg object-cover bg-gray-800 flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-24 h-36 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-2xl font-bold flex-shrink-0">
                    {person.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-white mb-1">{person.name}</h3>
                  {person.known_for_department && (
                    <p className="text-sm text-gray-400 mb-2">{person.known_for_department}</p>
                  )}
                  <div className="text-sm text-gray-400 space-y-0.5">
                    {person.birthday && (
                      <p>Born: {formatLocaleDate(person.birthday)}{person.place_of_birth ? ` — ${person.place_of_birth}` : ''}</p>
                    )}
                    {person.deathday && <p>Died: {formatLocaleDate(person.deathday)}</p>}
                  </div>
                </div>
              </div>

              {/* Biography */}
              {person.biography && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-1">Biography</h4>
                  <p
                    className={`text-sm text-gray-300 leading-relaxed whitespace-pre-line ${
                      bioExpanded ? '' : 'line-clamp-4'
                    }`}
                  >
                    {person.biography}
                  </p>
                  <button
                    onClick={() => setBioExpanded((v) => !v)}
                    className="mt-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {bioExpanded ? 'Show less' : 'Show more'}
                  </button>
                </div>
              )}

              {/* Credits */}
              {aggregatedCredits.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Credits</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {aggregatedCredits.map((credit) => (
                      <a
                        key={`${credit.media_type}-${credit.id}`}
                        href={credit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition cursor-pointer block"
                      >
                        {credit.poster_url ? (
                          <img
                            src={credit.poster_url}
                            alt={credit.title}
                            className="w-full aspect-[2/3] object-cover bg-gray-700"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-gray-700 flex items-center justify-center text-gray-600 text-xs">
                            No image
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs text-white font-medium truncate" title={credit.title}>{credit.title}</p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {credit.year && <span>{credit.year} · </span>}
                            {credit.roles.join(', ') || '—'}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
