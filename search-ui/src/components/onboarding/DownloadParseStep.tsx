import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTask, fetchTask } from "../../lib/api";
import { useOnboarding } from "../../contexts/OnboardingContext";
import type { Task } from "../../types/tasks";

interface Props {
  onNext: () => void;
  onBack: () => void;
  onPhaseChange?: (phase: Phase) => void;
}

export type Phase = "idle" | "downloading" | "parsing" | "done" | "failed";

export default function DownloadParseStep({ onNext: _onNext, onBack, onPhaseChange }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const queryClient = useQueryClient();
  const { currentTask, saveStep } = useOnboarding();

  const downloadMutation = useMutation({
    mutationFn: () => createTask("/task/download", { skip_if_present: true }),
    onSuccess: (data) => {
      setPhase("downloading");
      saveStep("download-and-filters", { task_id: data.task_id, task_type: "download", phase: "downloading" });
      pollTask(data.task_id, () => {
        // On download complete, trigger category extraction
        reindexMutation.mutate();
      });
    },
    onError: (err: Error) => {
      setPhase("failed");
      setError(err.message);
    },
  });

  const reindexMutation = useMutation({
    mutationFn: () => createTask("/task/extract-categories"),
    onSuccess: (data) => {
      setPhase("parsing");
      saveStep("download-and-filters", { task_id: data.task_id, task_type: "extract-categories", phase: "extracting" });
      pollTask(data.task_id, () => {
        setPhase("done");
        saveStep("download-and-filters", null);
      });
    },
    onError: (err: Error) => {
      setPhase("failed");
      setError(err.message);
    },
  });

  const pollTask = (taskId: string, onComplete: () => void) => {
    const interval = setInterval(async () => {
      try {
        const t = await fetchTask(taskId);
        setTask(t);
        if (t.status === "completed") {
          clearInterval(interval);
          onComplete();
        } else if (t.status === "failed") {
          clearInterval(interval);
          setPhase("failed");
          setError(t.error ?? "Task failed");
          saveStep("download-and-filters", null);
        }
      } catch {
        clearInterval(interval);
        setPhase("failed");
        setError("Failed to check task status");
      }
    }, 5000);
  };

  // Warn user before closing/navigating away during active processing
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
  }, []);

  // Report phase changes to parent component
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  // Invalidate all category queries when parsing completes
  useEffect(() => {
    if (phase === "done") {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  }, [phase, queryClient]);

  useEffect(() => {
    const isActive = phase === "downloading" || phase === "parsing";
    if (isActive) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    } else {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [phase, handleBeforeUnload]);

  // Auto-start: resume persisted task or start fresh
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (currentTask?.task_id && (currentTask.phase === "downloading" || currentTask.phase === "reindexing")) {
      // Resume polling the persisted task
      const resumedPhase: Phase = currentTask.phase === "downloading" ? "downloading" : "parsing";
      setPhase(resumedPhase);
      const onResumedComplete = currentTask.phase === "downloading"
        ? () => reindexMutation.mutate()
        : () => { setPhase("done"); saveStep("download", null); };
      pollTask(currentTask.task_id, onResumedComplete);
    } else {
      downloadMutation.mutate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const phaseLabel: Record<Phase, string> = {
    idle: "Preparing...",
    downloading: "Downloading M3U & XML files...",
    parsing: "Parsing categories into search index...",
    done: "Download and parse complete!",
    failed: "Failed",
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">Download & Parse</h2>
        <p className="text-sm text-gray-400">
          Downloading your IPTV playlist and EPG data, then parsing categories into the search index.
        </p>
        {(phase === "downloading" || phase === "parsing") && (
          <div className="mt-2 px-3 py-2 bg-amber-900/30 border border-amber-700 rounded text-sm text-amber-300">
            Do not navigate away or close this page. The download and parsing process may take several minutes.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          {phase === "downloading" || phase === "parsing" ? (
            <svg className="w-4 h-4 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : phase === "done" ? (
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : phase === "failed" ? (
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : null}
          <span className={phase === "failed" ? "text-red-400" : phase === "done" ? "text-green-400" : "text-gray-300"}>
            {phaseLabel[phase]}
          </span>
        </div>

        {task?.logs && (
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Show logs</summary>
            <pre className="mt-1 p-2 bg-gray-900 rounded text-xs text-gray-400 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
              {task.logs}
            </pre>
          </details>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={phase === "downloading" || phase === "parsing"}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <div className="flex gap-3">
          {phase === "failed" && (
            <button
              onClick={() => downloadMutation.mutate()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
