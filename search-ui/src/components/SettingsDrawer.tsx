import { useEffect, useId } from 'react'
import { useSettings } from '../contexts/SettingsContext'

interface Props {
  open: boolean
  onClose: () => void
}

const SIZE_OPTIONS = [
  { value: 'small', label: 'A' },
  { value: 'normal', label: 'A' },
  { value: 'large', label: 'A' },
] as const

const SIZE_CLASSES: Record<string, string> = {
  small: 'text-sm',
  normal: 'text-lg',
  large: 'text-2xl',
}

export default function SettingsDrawer({ open, onClose }: Props) {
  const { settings, setSetting } = useSettings()
  const currentSize = settings.subtitle_size ?? 'normal'
  const currentOffset = parseInt(settings.subtitle_offset ?? '0', 10) || 0
  const sliderId = useId()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-gray-900 border-l border-gray-700 shadow-2xl transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-700">
          <h2 className="text-base font-semibold text-gray-200">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Transcode Live TV</h3>
              <button
                onClick={() => setSetting('transcode_enabled', settings.transcode_enabled === 'true' ? 'false' : 'true')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.transcode_enabled !== 'false' ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.transcode_enabled !== 'false' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <span className="text-xs text-gray-500 mt-1 block">
              {settings.transcode_enabled !== 'false' ? 'On — convert HEVC/AC3 for browser' : 'Off — raw passthrough (faster, may lack audio)'}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Subtitles</h3>
              <button
                onClick={() => setSetting('subtitle_enabled', settings.subtitle_enabled === 'true' ? 'false' : 'true')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.subtitle_enabled === 'true' ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.subtitle_enabled === 'true' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <span className="text-xs text-gray-500 mt-1 block">
              {settings.subtitle_enabled === 'true' ? 'On' : 'Off'}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Subtitle Size</h3>
            <div className="flex gap-2">
              {SIZE_OPTIONS.map((opt) => {
                const isActive = currentSize === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSetting('subtitle_size', opt.value)}
                    className={`flex-1 h-12 flex items-center justify-center rounded-lg border font-bold transition-colors ${
                      isActive
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                  >
                    <span className={SIZE_CLASSES[opt.value]}>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Subtitle Offset</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-8 text-right">−5s</span>
              <style>{`
                #${CSS.escape(sliderId)}::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  background: #3b82f6;
                  cursor: pointer;
                  border: 2px solid #1e3a5f;
                }
                #${CSS.escape(sliderId)}::-moz-range-thumb {
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  background: #3b82f6;
                  cursor: pointer;
                  border: 2px solid #1e3a5f;
                }
              `}</style>
              <input
                id={sliderId}
                type="range"
                min="-5000"
                max="5000"
                step="250"
                value={currentOffset}
                onChange={(e) => setSetting('subtitle_offset', e.target.value)}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 ${((currentOffset + 5000) / 10000) * 100}%, #374151 ${((currentOffset + 5000) / 10000) * 100}%)`,
                }}
              />
              <span className="text-xs text-gray-500 w-8">+5s</span>
            </div>
            <div className="text-center mt-2">
              <span className="text-sm text-gray-200 font-mono">
                {currentOffset === 0 ? '0ms' : `${currentOffset > 0 ? '+' : ''}${currentOffset}ms`}
              </span>
              {currentOffset !== 0 && (
                <button
                  onClick={() => setSetting('subtitle_offset', '0')}
                  className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
