import { Link } from 'react-router-dom'

export default function CollectionsPage() {
  return (
    <div>
      <Link
        to="/library/movies"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Movies
      </Link>
      <div className="text-center py-24">
        <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="text-lg font-medium text-gray-400 mb-1">Collections</h3>
        <p className="text-sm text-gray-500">Coming soon.</p>
      </div>
    </div>
  )
}
