import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { InstantSearch, useSearchBox } from "react-instantsearch";
import { instantMeiliSearch } from "@meilisearch/instant-meilisearch";
import { useQuery } from "@tanstack/react-query";
import SearchBox from "../features/search/components/SearchBox";
import ContentTypeFilter from "../features/search/components/ContentTypeFilter";
import ContentTypeFilterButtons from "../features/search/components/ContentTypeFilterButtons";
import ListingsHits from "../features/search/components/ListingsHits";
import Hits from "../features/search/components/Hits";
import PopularHits from "../features/search/components/PopularHits";
import Pagination from "../features/shared/components/Pagination";
import DetailModal from "../components/DetailModal";
import FocusableSection from "../components/FocusableSection";
import type { SearchCardItem } from "../types";
import { fetchEmbyStatus } from "../lib/api";
import { useSearchFocus } from "../contexts/SearchFocusContext";
import { isVRHeadset } from "../lib/vr-detect";

const { searchClient } = instantMeiliSearch(
  window.location.origin + "/api/search",
  import.meta.env.VITE_API_KEY,
);

interface PopularItem {
  tmdb_id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  release_date: string
  year: number | null
  type: 'movie' | 'tv'
}

export default function SearchPage() {
  const [selectedHit, setSelectedHit] = useState<SearchCardItem | null>(null);
  const [selectedPopularItem, setSelectedPopularItem] = useState<PopularItem | null>(null);
  const navigate = useNavigate();
  const { registerSearchInput } = useSearchFocus();

  const { data: status } = useQuery({
    queryKey: ["emby-status"],
    queryFn: fetchEmbyStatus,
    staleTime: Infinity,
  });

  const pendingChanges = status?.sync_status?.pending_changes ?? 0;

  const handleClose = useCallback(() => {
    setSelectedHit(null);
    setSelectedPopularItem(null);
  }, []);

  const handleSelectHit = useCallback((hit: SearchCardItem) => {
    setSelectedHit(hit);
    setSelectedPopularItem(null);
  }, []);

  const handlePopularSelect = useCallback((item: PopularItem) => {
    setSelectedPopularItem(item);
    setSelectedHit(null);
  }, []);

  return (
    <InstantSearch searchClient={searchClient} indexName="iptv_content">
      {/* Mobile Header */}
      <div className="md:hidden flex-shrink-0 max-w-full bg-gray-850 border-b border-gray-700">
        <div className="p-4">
          <MobileSearchBox inputRef={registerSearchInput} />
        </div>
        <div className="px-4 pb-3">
          <ContentTypeFilterButtons />
        </div>
      </div>

      {/* Desktop + Mobile layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-72 flex-shrink-0 bg-gray-850 border-r border-gray-700 flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <SearchBox inputRef={registerSearchInput} />
            <ContentTypeFilter />
          </div>
          {isVRHeadset() && (
            <div className="flex-shrink-0 p-4 border-t border-gray-700">
              <button
                onClick={() => navigate('/vr')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4.5 4.5h15v15h-15z" />
                  <circle cx="8" cy="12" r="1.5" />
                  <circle cx="16" cy="12" r="1.5" />
                  <path d="M8 16c2.5 2 5.5 2 8 0" />
                </svg>
                Enter VR
              </button>
            </div>
          )}
        </aside>

        {/* Results - single instance with responsive padding */}
        <FocusableSection
          id="search-results"
          focusGroup="results"
          className="flex-1 min-w-0 flex flex-col overflow-hidden"
        >
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <ListingsHits onSelectListing={handleSelectHit} />
              <PopularHits onSelect={handlePopularSelect} />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-200">Content</h2>
                </div>
                <Hits onSelectHit={handleSelectHit} />
              </div>
            </div>
            <div className={`flex-shrink-0 px-4 md:px-6 ${pendingChanges > 0 ? 'pb-20 md:pb-16' : 'pb-4'}`}>
              <Pagination />
            </div>
          </div>
        </FocusableSection>
      </div>

      <DetailModal hit={selectedHit} popularItem={selectedPopularItem} onClose={handleClose} />
    </InstantSearch>
  );
}

// Mobile search box component
interface MobileSearchBoxProps {
  inputRef?: (ref: HTMLInputElement | null) => void
}

function MobileSearchBox({ inputRef }: MobileSearchBoxProps) {
  const { query, refine } = useSearchBox();

  return (
    <input
      ref={inputRef}
      type="search"
      value={query}
      onChange={(e) => refine(e.target.value)}
      placeholder="Search..."
      className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-500"
    />
  );
}
