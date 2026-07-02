import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { createTask, fetchTask, completeOnboarding } from "../../lib/api";
import { useOnboarding } from "../../contexts/OnboardingContext";
import type { Task } from "../../types/tasks";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

type Phase = "idle" | "running" | "done" | "failed";

export default function FinishStep({ onBack, onNext }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const { refetch, currentTask, saveStep } = useOnboarding();

  const runMutation = useMutation({
    mutationFn: () => createTask("/task/reindex", { index_type: "all" }),
    onSuccess: (data) => {
      setPhase("running");
      saveStep("build-library", { task_id: data.task_id, task_type: "reindex", phase: "running" });
      pollTask(data.task_id);
    },
    onError: (err: Error) => {
      setPhase("failed");
      setError(err.message);
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      refetch();
      onNext();
    },
  });

  const pollTask = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const t = await fetchTask(taskId);
        setTask(t);
        if (t.status === "completed") {
          clearInterval(interval);
          setPhase("done");
          saveStep("build-library", null);
          completeMutation.mutate();
        } else if (t.status === "failed") {
          clearInterval(interval);
          setPhase("failed");
          setError(t.error ?? "Task failed");
          saveStep("build-library", null);
        }
      } catch {
        clearInterval(interval);
        setPhase("failed");
        setError("Failed to check task status");
      }
    }, 5000);
  };

  // Resume persisted task if one exists
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (currentTask?.task_id && currentTask.phase === "running") {
      setPhase("running");
      pollTask(currentTask.task_id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = () => {
    setError(null);
    runMutation.mutate();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">Initial Processing</h2>
        <p className="text-sm text-gray-400">
          Process your downloaded playlist and build the search index.
          This may take a moment depending on the size of your IPTV provider's library.
        </p>
      </div>

      {phase === "idle" && (
        <div className="flex justify-center py-4">
          <button
            onClick={handleStart}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold transition-colors"
          >
            Start Processing
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="flex items-center gap-3 justify-center py-4">
          <svg className="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-gray-300">Processing your library...</span>
        </div>
      )}

      {phase === "done" && (
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-400 font-medium">Processing complete!</span>
          </div>
          <p className="text-sm text-gray-400">Redirecting to the admin panel...</p>
        </div>
      )}

      {phase === "failed" && (
        <div className="space-y-3">
          <div className="px-3 py-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
            {error ?? "Processing failed. You can retry or skip and run it later from the admin panel."}
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setPhase("idle");
                setError(null);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm font-medium transition-colors"
            >
              Skip & Finish Setup
            </button>
          </div>
        </div>
      )}

      {task?.logs && phase !== "idle" && (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Show logs</summary>
          <pre className="mt-1 p-2 bg-gray-900 rounded text-xs text-gray-400 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
            {task.logs}
          </pre>
        </details>
      )}

      {phase === "idle" && (
        <div className="flex justify-start pt-4 border-t border-gray-700">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
