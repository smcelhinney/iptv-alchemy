import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPlannerChannels, fetchPlannerEpg } from '../lib/api/planner-service'
import { usePlayerStore } from '../stores/playerStore'
import { proxyImageUrl } from '../lib/proxy'
import type { PlannerChannel, PlannerEpgItem } from '../lib/api/planner-service'

const HOUR_WIDTH = 120
const ROW_HEIGHT = 80
const SIDEBAR_WIDTH = 100
const TIMELINE_HEIGHT = 48
const HOURS_IN_DAY = 24

function getTodayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function formatLocalDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

function getProgrammePosition(
  startDate: Date,
  item: PlannerEpgItem,
  channelIndex: number
) {
  const since = new Date(item.since)
  const till = new Date(item.till)
  const hoursSinceStart = (since.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  const durationHours = (till.getTime() - since.getTime()) / (1000 * 60 * 60)
  return {
    left: Math.max(0, hoursSinceStart * HOUR_WIDTH),
    width: Math.max(0, durationHours * HOUR_WIDTH),
    top: channelIndex * ROW_HEIGHT,
    height: ROW_HEIGHT,
  }
}

function ChannelCell({ channel }: { channel: PlannerChannel }) {
  return (
    <div
      className="flex items-center justify-center border-b border-gray-700 bg-gray-850 px-1"
      style={{ height: ROW_HEIGHT, width: SIDEBAR_WIDTH }}
    >
      <img
        src={proxyImageUrl(channel.logo) ?? channel.logo}
        alt={channel.name}
        className="max-h-12 max-w-full object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }}
      />
      <span className="text-xs text-center truncate w-full">{channel.name}</span>
    </div>
  )
}

function ProgrammeTile({
  item,
  position,
  onClick,
}: {
  item: PlannerEpgItem
  position: { left: number; top: number; width: number; height: number }
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="absolute text-left p-1.5 overflow-hidden border border-gray-600 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height,
        minWidth: 4,
      }}
    >
      <div className="text-xs font-medium truncate">{item.title}</div>
      <div className="text-[10px] text-gray-400 truncate">
        {new Date(item.since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
        {new Date(item.till).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </button>
  )
}

export default function PlannerPage() {
  const today = useMemo(() => getTodayStart(), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [now, setNow] = useState(() => new Date())
  const dateStr = useMemo(() => formatLocalDateInput(selectedDate), [selectedDate])
  const startDate = useMemo(() => {
    const d = new Date(selectedDate)
    d.setHours(0, 0, 0, 0)
    return d
  }, [selectedDate])
  const timezoneOffset = useMemo(() => new Date().getTimezoneOffset(), [])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const currentTimeLeft = useMemo(() => {
    const hoursSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    return hoursSinceStart * HOUR_WIDTH
  }, [now, startDate])

  const openPlayer = usePlayerStore((s) => s.openPlayer)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['planner-channels'],
    queryFn: fetchPlannerChannels,
    staleTime: 12 * 60 * 60 * 1000,
  })

  const { data: epgData, isLoading: epgLoading } = useQuery({
    queryKey: ['planner-epg', dateStr, timezoneOffset],
    queryFn: () => fetchPlannerEpg(dateStr, timezoneOffset),
    staleTime: 12 * 60 * 60 * 1000,
  })

  const channels = useMemo(() => channelsData ?? [], [channelsData])
  const epg = epgData?.epg ?? []

  const contentWidth = HOURS_IN_DAY * HOUR_WIDTH
  const contentHeight = channels.length * ROW_HEIGHT

  const handlePrevDay = useCallback(() => {
    setSelectedDate((d) => {
      const next = new Date(d)
      next.setDate(next.getDate() - 1)
      return next
    })
  }, [])

  const handleNextDay = useCallback(() => {
    setSelectedDate((d) => {
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      return next
    })
  }, [])

  const handleNow = useCallback(() => {
    setSelectedDate(getTodayStart())
  }, [])

  const isLoading = channelsLoading || epgLoading

  // Auto-scroll horizontally to current time when the page loads or date changes.
  useEffect(() => {
    if (isLoading || channels.length === 0) return
    const el = scrollRef.current
    if (!el) return
    const now = new Date()
    const hoursSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    const currentTimeLeft = hoursSinceStart * HOUR_WIDTH
    const viewportWidth = el.clientWidth - SIDEBAR_WIDTH
    const target = currentTimeLeft - viewportWidth * 0.25
    el.scrollLeft = Math.max(0, target)
  }, [dateStr, isLoading, channels.length, startDate])

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-850 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">TV Planner</h1>
          <button onClick={handlePrevDay} className="px-2 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600">
            ←
          </button>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-2 py-1 text-sm rounded bg-gray-800 border border-gray-600"
          />
          <button onClick={handleNextDay} className="px-2 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600">
            →
          </button>
        </div>
        <button
          onClick={handleNow}
          className="px-3 py-1.5 text-sm font-medium rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          Today
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0 relative">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="w-8 h-8 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-3" />
            Loading guide...
          </div>
        ) : channels.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 px-6 text-center">
            No channels available.
            <br />
            Run the processor to generate output.m3u and output.xml.
          </div>
        ) : (
          <div
            className="grid bg-gray-900"
            style={{
              gridTemplateColumns: `${SIDEBAR_WIDTH}px ${contentWidth}px`,
              gridTemplateRows: `${TIMELINE_HEIGHT}px ${contentHeight}px`,
              width: 'fit-content',
              minWidth: '100%',
            }}
          >
            {/* Corner */}
            <div
              className="sticky top-0 left-0 z-30 bg-gray-800 border-b border-r border-gray-700"
              style={{ width: SIDEBAR_WIDTH, height: TIMELINE_HEIGHT }}
            />

            {/* Timeline */}
            <div
              className="sticky top-0 z-20 bg-gray-800 flex"
              style={{ height: TIMELINE_HEIGHT, width: contentWidth }}
            >
              {Array.from({ length: HOURS_IN_DAY }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 border-r border-gray-700 text-xs text-gray-400 flex items-center px-1"
                  style={{ width: HOUR_WIDTH, height: TIMELINE_HEIGHT }}
                >
                  {formatHour(i)}
                </div>
              ))}
            </div>

            {/* Sidebar */}
            <div
              className="sticky left-0 z-20 bg-gray-800"
              style={{ width: SIDEBAR_WIDTH, height: contentHeight }}
            >
              {channels.map((channel) => (
                <ChannelCell key={channel.uuid} channel={channel} />
              ))}
            </div>

            {/* Content grid lines + programmes */}
            <div
              className="relative"
              style={{ width: contentWidth, height: contentHeight }}
            >
              {Array.from({ length: HOURS_IN_DAY }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-gray-800"
                  style={{ left: i * HOUR_WIDTH, width: 1 }}
                />
              ))}
              {channels.map((_, index) => (
                <div
                  key={index}
                  className="absolute left-0 right-0 border-b border-gray-800"
                  style={{ top: index * ROW_HEIGHT, height: 1 }}
                />
              ))}

              {epg.map((item) => {
                const channelIndex = channels.findIndex((c) => c.uuid === item.channelUuid)
                if (channelIndex === -1) return null
                const position = getProgrammePosition(startDate, item, channelIndex)
                if (position.width <= 0) return null
                return (
                  <ProgrammeTile
                    key={item.id}
                    item={item}
                    position={position}
                    onClick={() => {
                      if (item.url) openPlayer(item.url, item.title, 'live')
                    }}
                  />
                )
              })}

              {/* Current time indicator */}
              <div
                className="absolute top-0 bottom-0 bg-yellow-400 z-10 pointer-events-none"
                style={{ left: currentTimeLeft, width: 3 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
