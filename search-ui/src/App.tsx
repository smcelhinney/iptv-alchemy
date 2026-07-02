import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, lazy, Suspense } from "react";
import Header from "./features/shared/components/Header";
import LibraryLayout from "./pages/LibraryLayout";
import TvChannelsPage from "./pages/TvChannelsPage";
import MoviesLayout from "./pages/MoviesLayout";
import MoviesGrid from "./pages/MoviesGrid";
import ShowsPage from "./pages/ShowsPage";
import SearchPage from "./pages/SearchPage";
import AdminPage from "./pages/AdminPage";
import MovieDetailPage from "./pages/MovieDetailPage";
import ShowDetailPage from "./pages/ShowDetailPage";
import CollectionsPage from "./pages/CollectionsPage";

import OnboardingPage from "./pages/OnboardingPage";
import { OnboardingProvider, useOnboarding } from "./contexts/OnboardingContext";
import { SearchFocusProvider } from "./contexts/SearchFocusContext";
import { ConnectionStatusProvider } from "./contexts/ConnectionStatusContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import OnboardingGuard from "./components/OnboardingGuard";
import { ToastProvider } from "./components/Toast";
import PlayerHost from "./components/PlayerHost";
import TVKeyHandler from "./components/TVKeyHandler";
import TVLayout from "./components/TVLayout";
import { fetchEmbyStatus, syncMedia, discardSyncChanges } from "./lib/api";
const VRPage = lazy(() => import("./pages/VRPage"));

const queryClient = new QueryClient();

function SyncFooter() {
  const qc = useQueryClient()

  const { data: status } = useQuery({
    queryKey: ['emby-status'],
    queryFn: fetchEmbyStatus,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const pending = query.state.data?.sync_status?.pending_changes ?? 0
      // Only poll when there are pending changes to sync
      if (pending > 0) {
        return 15_000
      }
      return false
    },
  })

  const pending = status?.sync_status?.pending_changes ?? 0

  const syncMutation = useMutation({
    mutationFn: syncMedia,
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['emby-status'] })
    },
  })

  const discardMutation = useMutation({
    mutationFn: discardSyncChanges,
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ['emby-status'] })
    },
  })

  if (pending === 0) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-amber-600/95 border-t border-amber-500 px-4 flex items-center gap-3"
      style={{ paddingTop: '0.75rem', paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
    >
      <span className="text-sm font-medium text-white shrink-0">
        {pending} unsynced change{pending !== 1 ? 's' : ''} pending
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded bg-white text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">{syncMutation.isPending ? 'Syncing...' : 'Sync Now'}</span>
        </button>
        <button
          onClick={() => discardMutation.mutate()}
          disabled={discardMutation.isPending || syncMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded border-2 border-white text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="hidden sm:inline">Discard</span>
        </button>
      </div>
    </div>
  )
}

function AppShell() {
  const { hasOnboarded } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();

  // Global Ctrl+S shortcut to navigate to search and focus input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        navigate("/");
        // Focus the search input after navigation
        setTimeout(() => {
          (window as unknown as { focusSearchInput: () => void }).focusSearchInput?.();
        }, 100);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  if (location.pathname === '/vr') {
    return (
      <Suspense fallback={<div className="h-screen bg-gray-900 flex items-center justify-center text-gray-400">Loading VR...</div>}>
        <Routes>
          <Route path="/vr" element={<VRPage />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <TVKeyHandler>
    <TVLayout>
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col overflow-hidden">
      {hasOnboarded && <Header />}
      <OnboardingGuard>
        <Routes>
          <Route path="/onboarding/:step?" element={<OnboardingPage />} />
          <Route path="/" element={<SearchPage />} />
          <Route path="/vr" element={
            <Suspense fallback={<div className="h-screen bg-gray-900 flex items-center justify-center text-gray-400">Loading VR...</div>}>
              <VRPage />
            </Suspense>
          } />
          {/* Library routes */}
          <Route path="/library" element={<LibraryLayout />}>
            <Route path="tv-channels" element={<TvChannelsPage />} />
            <Route path="movies" element={<MoviesLayout />}>
              <Route index element={<MoviesGrid />} />
              <Route path="collections" element={<CollectionsPage />} />
            </Route>
            <Route path="tv-shows" element={<ShowsPage />} />
          </Route>
          <Route path="/library/movies/:id" element={<MovieDetailPage />} />
          <Route path="/library/tv-shows/:id" element={<ShowDetailPage />} />
          <Route path="/library/tv-shows/:id/season/:seasonNum" element={<ShowDetailPage />} />
          {/* Admin routes with default redirect */}
          <Route path="/admin" element={<Navigate to="/admin/filters" replace />} />
          <Route path="/admin/:tab" element={<AdminPage />} />
        </Routes>
      </OnboardingGuard>
      {hasOnboarded && <SyncFooter />}
      <PlayerHost />
    </div>
    </TVLayout>
    </TVKeyHandler>
  );
}

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ConnectionStatusProvider>
          <ToastProvider>
            <OnboardingProvider>
              <SearchFocusProvider>
                <SettingsProvider>
                  <AppShell />
                </SettingsProvider>
              </SearchFocusProvider>
            </OnboardingProvider>
          </ToastProvider>
        </ConnectionStatusProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
