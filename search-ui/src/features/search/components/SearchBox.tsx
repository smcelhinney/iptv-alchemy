import { useSearchBox } from 'react-instantsearch'
import { isTV } from '../../../lib/device'

interface SearchBoxProps {
  inputRef?: (ref: HTMLInputElement | null) => void
}

export default function SearchBox({ inputRef }: SearchBoxProps) {
  const { query, refine } = useSearchBox()
  const tvMode = isTV()

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">Search</label>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => refine(e.target.value)}
        placeholder="Series, movies, channels..."
        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
        autoFocus={!tvMode}
      />
    </div>
  )
}
