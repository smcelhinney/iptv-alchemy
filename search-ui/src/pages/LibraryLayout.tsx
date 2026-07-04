import { useEffect, type ReactNode } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary'

export function LibrarySidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="w-72 flex-shrink-0 bg-gray-850 border-r border-gray-700 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {children}
      </div>
    </aside>
  )
}

export function SortSection({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
        Sort
      </div>
      {children}
    </>
  )
}

export function SortButton({ to, active, onClick, label }: { to: string; active: boolean; onClick: () => void; label: string }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-gray-800 text-white'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
      }`}
    >
      {label}
    </NavLink>
  )
}

export default function LibraryLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: library, isLoading } = useLibrary()

  const movieIds = library?.movies ?? []
  const seriesIds = library?.series ?? []
  const tvChannelIds = library?.tv_channels ?? []

  // Redirect /library → /library/tv-channels
  useEffect(() => {
    if (location.pathname === '/library') {
      navigate('/library/tv-channels', { replace: true })
    }
  }, [location.pathname, navigate])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-gray-700">
        <div className="flex gap-6 px-6 pt-6">
          <NavLink
            to="/library/tv-channels"
            className={({ isActive }: { isActive: boolean }) =>
              `pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`
            }
          >
            TV Channels ({tvChannelIds.length})
          </NavLink>
          <NavLink
            to="/library/movies"
            className={({ isActive }: { isActive: boolean }) =>
              `pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`
            }
          >
            Movies ({movieIds.length})
          </NavLink>
          <NavLink
            to="/library/tv-shows"
            className={({ isActive }: { isActive: boolean }) =>
              `pb-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`
            }
          >
            TV Shows ({seriesIds.length})
          </NavLink>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {isLoading && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading library...
            </div>
          </div>
        )}
        {!isLoading && <Outlet />}
      </div>
    </div>
  )
}
