import { useUpNext } from '../../../hooks/useUpNext'
import UpNextCard from './UpNextCard'

function UpNextSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-200">Up next</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[22rem] sm:w-[26rem] h-48 bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}

export default function UpNextSection() {
  const { data: items, isLoading } = useUpNext()

  if (isLoading) {
    return <UpNextSkeleton />
  }

  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-200">Up next</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {items.map((item) => (
          <UpNextCard key={`${item.type}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  )
}
