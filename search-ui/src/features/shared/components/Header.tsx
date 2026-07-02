import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useFocusable } from '../../../hooks/useFocusable'
import { isTV } from '../../../lib/device'
import SettingsDrawer from '../../../components/SettingsDrawer'

export default function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const logoLink = useFocusable<HTMLAnchorElement>({
    id: 'nav-logo',
    focusGroup: 'header',
    onActivate: () => document.getElementById('nav-logo-link')?.click(),
  })

  const searchLink = useFocusable<HTMLAnchorElement>({
    id: 'nav-search',
    focusGroup: 'header',
    onActivate: () => document.getElementById('nav-search-link')?.click(),
  })

  const libraryLink = useFocusable<HTMLAnchorElement>({
    id: 'nav-library',
    focusGroup: 'header',
    onActivate: () => document.getElementById('nav-library-link')?.click(),
  })

  const adminLink = useFocusable<HTMLAnchorElement>({
    id: 'nav-admin',
    focusGroup: 'header',
    onActivate: () => document.getElementById('nav-admin-link')?.click(),
  })

  const tvMode = isTV()

  return (
    <header
      className="bg-gray-800 border-b border-gray-700 px-6 flex items-center gap-8"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: 'max(0.75rem)' }}
    >
      <NavLink to="/" id="nav-logo-link" ref={tvMode ? logoLink.ref : undefined} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 3.75v16.5M3.75 9.75h6M3.75 14.25h6"
            />
          </svg>
        </div>
        <span className="text-lg font-bold">IPTV</span>
      </NavLink>
      <nav className="flex items-center gap-1">
        <NavLink
          to="/"
          end
          id="nav-search-link"
          ref={tvMode ? searchLink.ref : undefined}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-750'
            }`
          }
        >
          Search
        </NavLink>
        <NavLink
          to="/library"
          id="nav-library-link"
          ref={tvMode ? libraryLink.ref : undefined}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-750'
            }`
          }
        >
          Library
        </NavLink>
        <NavLink
          to="/admin/filters"
          id="nav-admin-link"
          ref={tvMode ? adminLink.ref : undefined}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-750'
            }`
          }
        >
          Admin
        </NavLink>
      </nav>

      <div className="ml-auto">
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          aria-label="Settings"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  )
}
