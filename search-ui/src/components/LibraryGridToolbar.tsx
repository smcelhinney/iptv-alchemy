interface LibraryGridToolbarProps {
  isSelecting: boolean
  selectedCount: number
  onStartSelect: () => void
  onCancel: () => void
  onDelete: () => void
  onAddToCollection: () => void
  filter?: string
  onFilterChange?: (value: string) => void
}

export default function LibraryGridToolbar({
  isSelecting,
  selectedCount,
  onStartSelect,
  onCancel,
  onDelete,
  onAddToCollection,
  filter,
  onFilterChange,
}: LibraryGridToolbarProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {onFilterChange && (
        <input
          type="text"
          value={filter ?? ''}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter…"
          className="flex-1 max-w-xs px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      )}
      <div className="flex-1" />
      {!isSelecting ? (
        <button
          onClick={onStartSelect}
          className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors"
        >
          Select multiple
        </button>
      ) : (
        <>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          {selectedCount > 0 && (
            <>
              <button
                onClick={onDelete}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Delete{selectedCount > 1 ? ` (${selectedCount})` : ''}
              </button>
              <button
                onClick={onAddToCollection}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Add to collection{selectedCount > 1 ? ` (${selectedCount})` : ''}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
