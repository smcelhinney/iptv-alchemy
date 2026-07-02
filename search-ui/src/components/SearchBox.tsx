import { useSearchBox } from 'react-instantsearch'

export default function SearchBox() {
  const { query, refine } = useSearchBox()

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">Search</label>
      <input
        type="search"
        value={query}
        onChange={(e) => refine(e.target.value)}
        placeholder="Series, movies, channels..."
        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
        autoFocus
      />
    </div>
  )
}
