import { useState } from "react"
import { useMutation } from "@tanstack/react-query"

interface SimpleActionCardProps {
  title: string
  description: string
  onExecute: () => Promise<unknown>
  disabled?: boolean
}

export default function SimpleActionCard({
  title,
  description,
  onExecute,
  disabled = false,
}: SimpleActionCardProps) {
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const mutation = useMutation({
    mutationFn: onExecute,
    onSuccess: () => {
      setResult({ type: "success", message: "Completed successfully" })
    },
    onError: (error: Error) => {
      setResult({ type: "error", message: error.message || "Failed to complete action" })
    },
  })

  const handleRun = () => {
    setResult(null)
    mutation.mutate()
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
          {result && (
            <div className={`mt-2 text-sm ${result.type === "success" ? "text-green-400" : "text-red-400"}`}>
              {result.message}
            </div>
          )}
        </div>
        <button
          onClick={handleRun}
          disabled={disabled || mutation.isPending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors whitespace-nowrap"
        >
          {mutation.isPending ? "Running..." : "Run"}
        </button>
      </div>
    </div>
  )
}
