import { useMenu } from 'react-instantsearch'

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

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {options.map((opt) => {
        const isActive = activeValue === opt.value
        return (
          <button
            key={opt.key}
            onClick={(e) => {
              e.preventDefault()
              if (opt.value === null) {
                const current = items.find((i) => i.isRefined)
                if (current) refine(current.value as string)
              } else {
                refine(opt.value)
              }
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {LABELS[opt.key] || opt.key}
          </button>
        )
      })}
    </div>
  )
}
