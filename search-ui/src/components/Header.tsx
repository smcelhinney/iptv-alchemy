import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center gap-8">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
      </div>
      <nav className="flex items-center gap-1">
        <NavLink
          to="/"
          end
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
          to="/admin"
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
    </header>
  )
}
