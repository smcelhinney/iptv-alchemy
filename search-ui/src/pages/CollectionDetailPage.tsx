import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchDocument } from '../lib/api'
import { useCollection, useRemoveFromCollection } from '../hooks/useCollections'
import { COLLECTION_TYPE_ROUTE, type CollectionType } from '../lib/api/collection-service'
import type { Hit } from '../types'
import SearchCard from '../components/SearchCard'
import { usePlayerStore } from '../stores/playerStore'

interface CollectionDetailPageProps {
  type: CollectionType
}

export default function CollectionDetailPage({ type }: CollectionDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: collection, isLoading } = useCollection(id)
  const removeMut = useRemoveFromCollection()

  const itemIds = collection?.items ?? []
  const listPath = `/library/${COLLECTION_TYPE_ROUTE[type]}/collections`

  return (
    <div>
      <button
        onClick={() => navigate(listPath)}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Collections
      </button>

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      {collection && (
        <>
          <h2 className="text-lg font-semibold text-white mb-4">{collection.name}</h2>

          {itemIds.length === 0 ? (
            <p className="text-gray-400 text-sm">This collection is empty.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {itemIds.map((docId) => (
                <CollectionItemCard
                  key={docId}
                  docId={docId}
                  onRemove={() => removeMut.mutate({ colId: id!, docId })}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CollectionItemCard({ docId, onRemove }: { docId: string; onRemove: () => void }) {
  const { data: doc } = useQuery({
    queryKey: ['document', docId],
    queryFn: () => fetchDocument<Hit>(docId),
  })
  const openPlayer = usePlayerStore((s) => s.openPlayer)

  const stubHit: Hit = doc || {
    id: docId,
    type: 'movie',
    name: docId,
    url: '',
    logo: '',
  }

  const to = doc?.type === 'series'
    ? `/library/tv-shows/${docId}`
    : doc?.type === 'movie'
      ? `/library/movies/${docId}`
      : undefined

  const handleSelect = () => {
    if (doc?.type === 'live_tv' && doc.url) {
      openPlayer(doc.url, doc.name || 'Unknown', 'live')
    }
  }

  return (
    <div className="min-w-0 flex">
      <SearchCard
        hit={stubHit}
        onSelect={handleSelect}
        to={to}
        onRemove={onRemove}
      />
    </div>
  )
}
