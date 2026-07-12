import { useEffect, type ReactNode } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary'

export function LibrarySidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="w-72 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {children}
      </div>
    </aside>
  )
}

interface LibraryDrawerProps {
  children: ReactNode
  open: boolean
  onClose: () => void
  title?: string
}

export function LibraryDrawer({ children, open, onClose, title = 'Menu' }: LibraryDrawerProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-72 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {children}
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        {/* Backdrop - rendered first so drawer sits on top */}
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />

        {/* Drawer panel */}
        <aside
          className={`absolute top-0 left-0 h-full w-72 bg-gray-900 border-r border-gray-700 flex flex-col transform transition-transform duration-300 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-4 h-14 border-b border-gray-700">
            <h2 className="text-base font-semibold text-gray-200">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {children}
          </div>
        </aside>
      </div>
    </>
  )
}

interface LibraryDrawerToggleProps {
  onClick: () => void
  label?: string
}

export function LibraryDrawerToggle({ onClick, label = 'Menu' }: LibraryDrawerToggleProps) {
  return (
    <div className="md:hidden flex-shrink-0 p-4 border-b border-gray-700">
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {label}
      </button>
    </div>
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
