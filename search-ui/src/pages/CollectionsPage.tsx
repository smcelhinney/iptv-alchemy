import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CollectionType } from '../lib/api/collection-service'
import { COLLECTION_TYPE_ROUTE } from '../lib/api/collection-service'
import { useCollections, useCreateCollection, useDeleteCollection } from '../hooks/useCollections'

interface CollectionsPageProps {
  type: CollectionType
}

export default function CollectionsPage({ type }: CollectionsPageProps) {
  const navigate = useNavigate()
  const routeSegment = COLLECTION_TYPE_ROUTE[type]
  const { data: collections, isLoading } = useCollections(type)
  const createMut = useCreateCollection(type)
  const deleteMut = useDeleteCollection()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    createMut.mutate(trimmed, {
      onSuccess: () => {
        setName('')
        setShowCreate(false)
      },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Collections</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Collection
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      {!isLoading && collections && collections.length === 0 && (
        <div className="text-center py-24">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-400 mb-1">No collections yet</p>
          <p className="text-sm text-gray-500">Create a collection to organize your movies and shows.</p>
        </div>
      )}

      {collections && collections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {collections.map((col) => (
            <div
              key={col.id}
              className="group relative bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors cursor-pointer"
              onClick={() => navigate(`/library/${routeSegment}/collections/${col.id}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-white truncate flex-1">{col.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete "${col.name}"?`)) deleteMut.mutate(col.id)
                  }}
                  className="ml-2 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700/50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-400">{col.count} {col.count === 1 ? 'item' : 'items'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-4">Create Collection</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
              placeholder="Collection name"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || createMut.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
              >
                {createMut.isPending ? 'Creating...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
