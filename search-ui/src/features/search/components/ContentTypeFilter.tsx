import { useMenu } from 'react-instantsearch'
import { useFocusable } from '../../../hooks/useFocusable'
import { isTV } from '../../../lib/device'

const LABELS: Record<string, string> = {
  all: 'All',
  series: 'Series',
  movie: 'Movie',
  live_tv: 'TV Channels',
}

export default function ContentTypeFilter() {
  const { items, refine } = useMenu({ attribute: 'type' })

  const activeValue = items.find((item) => item.isRefined)?.value ?? null

  // Fixed display order so buttons don't jump around
  const SORT_ORDER = ['series', 'movie', 'live_tv']
  const availableTypes = SORT_ORDER.filter((type) =>
    items.some((item) => item.value === type)
  )

  const options = [
    { key: 'all', value: null },
    ...availableTypes.map((type) => ({ key: type, value: type })),
  ]

  const handleClick = (value: string | null) => {
    if (value === null) {
      const current = items.find((i) => i.isRefined)
      if (current) refine(current.value as string)
    } else {
      refine(value)
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-2">Content Type</label>
      <div className="flex flex-col gap-1">
        {options.map((opt) => (
          <FilterButton
            key={opt.key}
            label={LABELS[opt.key] || opt.key}
            isActive={activeValue === opt.value}
            onClick={() => handleClick(opt.value)}
          />
        ))}
      </div>
    </div>
  )
}

interface FilterButtonProps {
  label: string
  isActive: boolean
  onClick: () => void
}

function FilterButton({ label, isActive, onClick }: FilterButtonProps) {
  const tvMode = isTV()
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `filter-${label.toLowerCase().replace(/\s+/g, '-')}`,
    focusGroup: 'filters',
    onActivate: onClick,
  })

  return (
    <button
      ref={tvMode ? ref : undefined}
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={`px-3 py-1.5 text-sm font-medium rounded-md text-left transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  )
}
