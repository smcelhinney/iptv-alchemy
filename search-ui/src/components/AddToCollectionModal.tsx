import { useState, useEffect, useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import type { CollectionType } from '../lib/api/collection-service'
import { useCollections, useCreateCollection, useAddToCollection, fetchDocCollections } from '../hooks/useCollections'

interface AddToCollectionModalProps {
  docId: string | string[]
  type: CollectionType
  onClose: () => void
}

export default function AddToCollectionModal({ docId, type, onClose }: AddToCollectionModalProps) {
  const docIds = useMemo(() => Array.isArray(docId) ? docId : [docId], [docId])
  const { data: collections } = useCollections(type)
  const docCollectionsResults = useQueries({
    queries: docIds.map((id) => ({
      queryKey: ['doc-collections', id],
      queryFn: () => fetchDocCollections(id),
      enabled: !!id,
    })),
  })
  const createMut = useCreateCollection(type)
  const addMut = useAddToCollection()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const docCollectionsMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    docIds.forEach((id, index) => {
      const data = docCollectionsResults[index]?.data
      map.set(id, new Set(Array.isArray(data) ? data : []))
    })
    return map
  }, [docIds, docCollectionsResults])

  const inAllCollections = useMemo(() => {
    const sets = Array.from(docCollectionsMap.values())
    if (sets.length === 0) return new Set<string>()
    const all = new Set<string>()
    sets[0].forEach((colId) => {
      if (sets.every((s) => s.has(colId))) {
        all.add(colId)
      }
    })
    return all
  }, [docCollectionsMap])

  const handleAdd = (colId: string) => {
    const missing = docIds.filter((id) => !docCollectionsMap.get(id)?.has(colId))
    for (const id of missing) {
      addMut.mutate({ colId, docId: id })
    }
  }

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    createMut.mutate(trimmed, {
      onSuccess: (col) => {
        for (const id of docIds) {
          addMut.mutate({ colId: col.id, docId: id })
        }
        setNewName('')
        setShowCreate(false)
      },
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">Add to Collection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {collections && collections.length === 0 && !showCreate && (
            <p className="text-sm text-gray-400 text-center py-8">
              No collections yet. Create one below.
            </p>
          )}

          {collections?.map((col) => {
            const checked = inAllCollections.has(col.id)
            return (
              <button
                key={col.id}
                onClick={() => handleAdd(col.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                  checked
                    ? 'bg-blue-600/20 border-blue-600 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="text-sm font-medium truncate">{col.name}</span>
                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{col.count} items</span>
                {checked && (
                  <svg className="w-4 h-4 text-blue-400 ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {/* Create new collection */}
        <div className="p-5 border-t border-gray-700 flex-shrink-0">
          {showCreate ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
                placeholder="New collection name"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || createMut.isPending}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName('') }}
                className="px-3 py-2 text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create new collection
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
