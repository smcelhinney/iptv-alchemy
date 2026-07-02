import { useMenu } from 'react-instantsearch'
import { useFocusable } from '../../../hooks/useFocusable'
import { isTV } from '../../../lib/device'

const LABELS: Record<string, string> = {
  all: 'All',
  series: 'Series',
  movie: 'Movies',
  live_tv: 'TV Channels',
}

export default function ContentTypeFilterButtons() {
  const { items, refine } = useMenu({ attribute: 'type' })

  const activeValue = items.find((item) => item.isRefined)?.value ?? null

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
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {options.map((opt) => (
        <FilterPill
          key={opt.key}
          label={LABELS[opt.key] || opt.key}
          isActive={activeValue === opt.value}
          onClick={() => handleClick(opt.value)}
        />
      ))}
    </div>
  )
}

interface FilterPillProps {
  label: string
  isActive: boolean
  onClick: () => void
}

function FilterPill({ label, isActive, onClick }: FilterPillProps) {
  const tvMode = isTV()
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `filterpill-${label.toLowerCase().replace(/\s+/g, '-')}`,
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
      className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  )
}
