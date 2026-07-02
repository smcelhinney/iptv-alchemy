import { useState, useRef, useEffect } from 'react'

interface MenuItem {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  danger?: boolean
}

interface MenuDropdownProps {
  items: MenuItem[]
  trigger: React.ReactNode
}

export default function MenuDropdown({ items, trigger }: MenuDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-max bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors whitespace-nowrap ${
                item.danger
                  ? 'text-red-400 hover:bg-red-900/30'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span className="flex-shrink-0">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
