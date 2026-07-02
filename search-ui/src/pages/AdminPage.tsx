import { useState, useEffect } from "react";
import { useParams, Navigate, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAllTasks, syncMedia } from "../lib/api";
import ConfigPanel from "../components/ConfigPanel";
import FiltersPanel from "../components/FiltersPanel";
import ActionCard from "../features/admin/components/ActionCard";
import SimpleActionCard from "../features/admin/components/SimpleActionCard";

type AdminTab = "configuration" | "filters" | "task-management";

interface ActionConfig {
  title: string;
  description: string;
  endpoint: string;
  taskType: string;
  showSkipIfPresent?: boolean;
  showIndexType?: boolean;
}

const ACTIONS: ActionConfig[] = [
  {
    title: "Redownload IPTV Files",
    description: "Download M3U/XML from Xtream server",
    endpoint: "/task/download",
    taskType: "download",
    showSkipIfPresent: true,
  },
  {
    title: "Extract Categories",
    description: "Parse M3U and store categories to Redis cache",
    endpoint: "/task/extract-categories",
    taskType: "extract_categories",
  },
  {
    title: "Reindex Meilisearch",
    description: "Rebuild search index from downloaded files (always purges old data)",
    endpoint: "/task/reindex",
    taskType: "reindex",
    showIndexType: true,
  },
  {
    title: "Recreate IPTV Files",
    description: "Generate filtered output.m3u/output.xml from downloaded data",
    endpoint: "/task/recreate-iptv",
    taskType: "recreate_iptv",
  },
];

export default function AdminPage() {
  const { tab } = useParams<{ tab: AdminTab }>()

  // Validate tab param, redirect to default if invalid
  const validTabs: AdminTab[] = ['filters', 'configuration', 'task-management']
  if (!tab || !validTabs.includes(tab as AdminTab)) {
    return <Navigate to="/admin/filters" replace />
  }

  const activeTab = tab as AdminTab

  const [taskMap, setTaskMap] = useState<Record<string, string | null>>({
    "/task/download": null,
    "/task/extract-categories": null,
    "/task/reindex": null,
    "/task/recreate-iptv": null,
  });

  // On mount, fetch all tasks from the server to recover state after refresh
  const { data: allTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchAllTasks,
    // Re-fetch periodically so we notice tasks finishing or new ones appearing
    refetchInterval: 5_000,
  });

  // Hydrate taskMap from server data – pick the most recent task per action type
  useEffect(() => {
    if (!allTasks || allTasks.length === 0) return;

    const next: Record<string, string | null> = {};

    for (const action of ACTIONS) {
      // Find the most recent task matching this action's type
      const match = allTasks.find((t) => t.type === action.taskType);
      if (match) {
        // Keep showing it if it's still active, or if it's the last completed/failed one
        // (so the user can see the result)
        const current = taskMap[action.endpoint];
        if (!current) {
          next[action.endpoint] = match.id;
        } else {
          next[action.endpoint] = current;
        }
      } else {
        next[action.endpoint] = taskMap[action.endpoint] ?? null;
      }
    }

    setTaskMap(next);
  }, [allTasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive whether any task is currently active (used for global lock)
  const activeTask = allTasks?.find(
    (t) => t.status === "pending" || t.status === "running",
  );

  const handleTaskCreated = (endpoint: string, taskId: string) => {
    setTaskMap((prev) => ({ ...prev, [endpoint]: taskId }));
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Tab bar */}
      <div className="flex gap-6 border-b border-gray-700 mb-6">
        <NavLink
          to="/admin/filters"
          className={({ isActive }) =>
            `pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-400 border-b-2 border-blue-500"
                : "text-gray-400 hover:text-gray-200"
            }`
          }
        >
          Filters
        </NavLink>
        <NavLink
          to="/admin/configuration"
          className={({ isActive }) =>
            `pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-400 border-b-2 border-blue-500"
                : "text-gray-400 hover:text-gray-200"
            }`
          }
        >
          Configuration
        </NavLink>
        <NavLink
          to="/admin/task-management"
          className={({ isActive }) =>
            `pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-blue-400 border-b-2 border-blue-500"
                : "text-gray-400 hover:text-gray-200"
            }`
          }
        >
          Task Management
        </NavLink>
      </div>

      {/* Tab content */}
      {activeTab === "configuration" && <ConfigPanel />}

      {activeTab === "filters" && <FiltersPanel />}

      {activeTab === "task-management" && (
        <>
          {activeTask && (
            <div className="mb-4 px-4 py-3 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-blue-300 flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              A task is currently running ({activeTask.type})
            </div>
          )}

          <div className="space-y-4 max-w-2xl">
            {ACTIONS.map((action) => (
              <ActionCard
                key={action.endpoint}
                config={action}
                runningTaskId={taskMap[action.endpoint]}
                onTaskCreated={(taskId) =>
                  handleTaskCreated(action.endpoint, taskId)
                }
                globalLock={!!activeTask}
              />
            ))}
            <SimpleActionCard
              title="Refresh Media Libraries"
              description="Trigger library refresh on configured Emby/Jellyfin servers"
              onExecute={syncMedia}
              disabled={!!activeTask}
            />
          </div>
        </>
      )}
    </div>
  );
}
