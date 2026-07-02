import { useMenu } from 'react-instantsearch'

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

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-2">Content Type</label>
      <div className="flex flex-col gap-1">
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
              className={`px-3 py-1.5 text-sm font-medium rounded-md text-left transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {LABELS[opt.key] || opt.key}
            </button>
          )
        })}
      </div>
    </div>
  )
}
