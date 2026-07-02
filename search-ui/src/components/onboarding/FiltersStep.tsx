import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchCategories,
  fetchConfig,
  batchSaveFilters,
} from "../../lib/api";

type SubTab = "movies" | "series" | "tv-listings";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "movies", label: "Movies" },
  { key: "series", label: "Series" },
  { key: "tv-listings", label: "TV Listings" },
];

interface Props {
  onNext: () => void;
  onBack: () => void;
  showButtons?: boolean;
  disabled?: boolean;
}

function CategoryCheckboxes({
  contentType,
  selections,
  onChange,
}: {
  contentType: SubTab;
  selections: Set<string>;
  onChange: (cats: Set<string>) => void;
}) {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["categories", contentType],
    queryFn: () => fetchCategories(contentType),
  });

  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];
    if (!search) return data.categories;
    const lower = search.toLowerCase();
    return data.categories.filter((c) => c.toLowerCase().includes(lower));
  }, [data?.categories, search]);

  const allFilteredSelected = useMemo(() => {
    if (filteredCategories.length === 0) return false;
    return filteredCategories.every((c) => selections.has(c));
  }, [filteredCategories, selections]);

  // Initialize from server data on first load
  useEffect(() => {
    if (data && selections.size === 0) {
      onChange(new Set(data.selected));
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return <div className="text-gray-400 text-sm">Loading categories...</div>;
  }

  if (isError || !data) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load categories. Make sure M3U has been parsed at least once.
      </div>
    );
  }

  if (data.categories.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        No categories found. Go back and ensure the download step completed successfully.
      </div>
    );
  }

  const toggleCategory = (cat: string) => {
    const next = new Set(selections);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    onChange(next);
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selections);
      for (const c of filteredCategories) next.delete(c);
      onChange(next);
    } else {
      const next = new Set(selections);
      for (const c of filteredCategories) next.add(c);
      onChange(next);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter categories..."
          className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {selections.size} of {data.categories.length} selected
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleAll}
          className="px-3 py-1 text-xs rounded border border-gray-600 hover:border-gray-400 text-gray-300 transition-colors"
        >
          {allFilteredSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-80 overflow-y-auto pr-1">
        {filteredCategories.map((cat) => (
          <label
            key={cat}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={selections.has(cat)}
              onChange={() => toggleCategory(cat)}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-300 truncate" title={cat}>
              {cat}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function FiltersStep({ onNext, onBack, showButtons = true, disabled = false }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("movies");
  const [excludeValue, setExcludeValue] = useState("");
  const [movieSelections, setMovieSelections] = useState<Set<string>>(new Set());
  const [seriesSelections, setSeriesSelections] = useState<Set<string>>(new Set());
  const [tvListingsSelections, setTvListingsSelections] = useState<Set<string>>(new Set());
  const selectionsInitialized = useRef(false);

  // Pre-populate all 3 tab selections from server on mount so unvisited tabs
  // don't send empty arrays when batchSaveFilters fires
  useEffect(() => {
    if (selectionsInitialized.current) return;
    selectionsInitialized.current = true;

    (async () => {
      try {
        const [moviesData, seriesData, tvListingsData] = await Promise.all([
          fetchCategories("movies"),
          fetchCategories("series"),
          fetchCategories("tv-listings"),
        ]);
        if (moviesData.selected.length > 0) setMovieSelections(new Set(moviesData.selected));
        if (seriesData.selected.length > 0) setSeriesSelections(new Set(seriesData.selected));
        if (tvListingsData.selected.length > 0) setTvListingsSelections(new Set(tvListingsData.selected));
      } catch {
        // Silently ignore — per-tab CategoryCheckboxes will still initialize on visit
      }
    })();
  }, []);

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  // Populate exclude value from config
  useEffect(() => {
    if (config && !excludeValue) {
      setExcludeValue(config.exclude_categories ?? "");
    }
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: () =>
      batchSaveFilters({
        exclude_categories: excludeValue,
        selected_categories: {
          movies: Array.from(movieSelections),
          series: Array.from(seriesSelections),
          tv_listings: Array.from(tvListingsSelections),
        },
      }),
    onSuccess: () => {
      onNext();
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const getSelections = (tab: SubTab): Set<string> => {
    switch (tab) {
      case "movies": return movieSelections;
      case "series": return seriesSelections;
      case "tv-listings": return tvListingsSelections;
    }
  };

  const setSelections = (tab: SubTab, cats: Set<string>) => {
    switch (tab) {
      case "movies": setMovieSelections(cats); break;
      case "series": setSeriesSelections(cats); break;
      case "tv-listings": setTvListingsSelections(cats); break;
    }
  };

  return (
    <div className={`space-y-5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div>
        <h2 className="text-lg font-semibold mb-1">Content Filters</h2>
        <p className="text-sm text-gray-400">
          Select which categories to include in your library and set a global exclude pattern.
        </p>
      </div>

      {/* Global exclude regex */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Global Exclude Pattern (regex)</label>
        <input
          type="text"
          value={excludeValue}
          onChange={(e) => setExcludeValue(e.target.value)}
          placeholder="^Server \d+|^VOD:"
          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Category sub-tabs */}
      <div>
        <div className="flex gap-4 border-b border-gray-700 mb-4">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`pb-2 text-sm font-medium transition-colors ${
                activeSubTab === tab.key
                  ? "text-blue-400 border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <CategoryCheckboxes
          contentType={activeSubTab}
          selections={getSelections(activeSubTab)}
          onChange={(cats) => setSelections(activeSubTab, cats)}
        />
      </div>

      {saveMutation.isError && (
        <div className="px-3 py-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
          Failed to save filters. Please try again.
        </div>
      )}

      {showButtons && (
        <div className="flex justify-between pt-4 border-t border-gray-700">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
          >
            {saveMutation.isPending ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      )}
    </div>
  );
}
