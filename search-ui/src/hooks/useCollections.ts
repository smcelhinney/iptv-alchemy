import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CollectionType } from '../lib/api/collection-service'
import {
  fetchCollections,
  createCollection,
  deleteCollection,
  fetchCollection,
  addToCollection,
  removeFromCollection,
  fetchDocCollections,
} from '../lib/api/collection-service'

export function useCollections(type: CollectionType) {
  return useQuery({
    queryKey: ['collections', type],
    queryFn: () => fetchCollections(type),
    staleTime: 10_000,
  })
}

export function useCreateCollection(type: CollectionType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createCollection(name, type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })
}

export function useDeleteCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })
}

export function useCollection(id: string | undefined) {
  return useQuery({
    queryKey: ['collection', id],
    queryFn: () => fetchCollection(id!),
    enabled: !!id,
    staleTime: 10_000,
  })
}

export function useAddToCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ colId, docId }: { colId: string; docId: string }) => addToCollection(colId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['doc-collections'] })
    },
  })
}

export function useRemoveFromCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ colId, docId }: { colId: string; docId: string }) => removeFromCollection(colId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['doc-collections'] })
    },
  })
}

export function useDocCollections(docId: string | undefined) {
  return useQuery({
    queryKey: ['doc-collections', docId],
    queryFn: () => fetchDocCollections(docId!),
    enabled: !!docId,
    staleTime: 10_000,
  })
}
