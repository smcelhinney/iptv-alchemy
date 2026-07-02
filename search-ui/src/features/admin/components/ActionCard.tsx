import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { createTask, fetchTask } from "../../../lib/api"
import type { Task } from "../../../types/tasks"

interface ActionConfig {
  title: string
  description: string
  endpoint: string
  taskType: string
  showSkipIfPresent?: boolean
  showIndexType?: boolean
}

const STATUS_COLORS: Record<Task["status"], string> = {
  pending: "text-yellow-400",
  running: "text-blue-400",
  completed: "text-green-400",
  failed: "text-red-400",
}

interface ActionCardProps {
  config: ActionConfig
  runningTaskId: string | null
  onTaskCreated: (taskId: string) => void
  globalLock: boolean
}

export default function ActionCard({
  config,
  runningTaskId,
  onTaskCreated,
  globalLock,
}: ActionCardProps) {
  const [showLogs, setShowLogs] = useState(false)
  const [skipIfPresent, setSkipIfPresent] = useState(false)
  const [indexType, setIndexType] = useState<"all" | "content" | "listings">("all")

  const isActive = runningTaskId !== null

  const { data: task } = useQuery({
    queryKey: ["task", runningTaskId],
    queryFn: () => fetchTask(runningTaskId!),
    enabled: isActive,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === "completed" || status === "failed") return false
      return 2000
    },
  })

  const isDone = task?.status === "completed" || task?.status === "failed"

  const createMutation = useMutation({
    mutationFn: () => {
      let body: Record<string, unknown> | undefined

      if (config.showSkipIfPresent) {
        body = { skip_if_present: skipIfPresent }
      } else if (config.showIndexType) {
        body = { index_type: indexType }
      }

      return createTask(config.endpoint, body)
    },
    onSuccess: (data) => {
      onTaskCreated(data.task_id)
    },
  })

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">{config.title}</h3>
          <p className="text-sm text-gray-400 mt-1">{config.description}</p>
          {config.showSkipIfPresent && (
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipIfPresent}
                onChange={(e) => setSkipIfPresent(e.target.checked)}
                disabled={globalLock}
                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50"
              />
              <span className="text-sm text-gray-300">Skip if files already exist</span>
            </label>
          )}
          {config.showIndexType && (
            <div className="mt-2">
              <label className="block text-sm text-gray-400 mb-1">Index type</label>
              <select
                value={indexType}
                onChange={(e) => setIndexType(e.target.value as "all" | "content" | "listings")}
                disabled={globalLock}
                className="px-3 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="all">All (content + listings)</option>
                <option value="content">Content only</option>
                <option value="listings">Listings only</option>
              </select>
            </div>
          )}
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={globalLock || (isActive && !isDone)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors whitespace-nowrap"
        >
          {createMutation.isPending
            ? "Starting..."
            : isActive && !isDone
              ? "Running..."
              : globalLock
                ? "Queued..."
                : "Run"}
        </button>
      </div>

      {task && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400">Status:</span>
            <span className={`font-medium ${STATUS_COLORS[task.status]}`}>
              {task.status}
            </span>
            {task.error && (
              <span className="text-red-400 text-xs">{task.error}</span>
            )}
            {task.result && (
              <span className="text-green-400 text-xs">{task.result}</span>
            )}
          </div>

          {task.logs && (
            <div>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showLogs ? "Hide logs" : "Show logs"}
              </button>
              {showLogs && (
                <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-300 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {task.logs}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
