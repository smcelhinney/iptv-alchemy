import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCategories,
  updateSelectedCategories,
  fetchConfig,
  updateConfig,
} from "../lib/api";

type SubTab = "movies" | "series" | "tv-listings";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "movies", label: "Movies" },
  { key: "series", label: "Series" },
  { key: "tv-listings", label: "TV Listings" },
];

function CategoryCheckboxes({ contentType }: { contentType: SubTab }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [localSelected, setLocalSelected] = useState<Set<string> | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["categories", contentType],
    queryFn: () => fetchCategories(contentType),
  });

  // Always sync local state from server data.
  // When contentType changes, React Query sets data to undefined (loading),
  // then fires a new fetch. When data arrives, this effect reinitializes localSelected.
  // After a save, the query invalidates and data refreshes — also resyncs here.
  useEffect(() => {
    if (data) {
      setLocalSelected(new Set(data.selected));
      setSearch("");
    }
  }, [data]);

  const selected = localSelected ?? new Set<string>();

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];
    if (!search) return data.categories;
    const lower = search.toLowerCase();
    return data.categories.filter((c) => c.toLowerCase().includes(lower));
  }, [data?.categories, search]);

  const allFilteredSelected = useMemo(() => {
    if (filteredCategories.length === 0) return false;
    return filteredCategories.every((c) => selected.has(c));
  }, [filteredCategories, selected]);

  const saveMutation = useMutation({
    mutationFn: (cats: string[]) =>
      updateSelectedCategories(contentType, cats),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories", contentType] });
    },
  });

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
        No categories found. Run "Full Refresh" or "Reindex Meilisearch" to parse the M3U file first.
      </div>
    );
  }

  const toggleCategory = (cat: string) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      setLocalSelected((prev) => {
        const next = new Set(prev);
        for (const c of filteredCategories) next.delete(c);
        return next;
      });
    } else {
      // Select all filtered
      setLocalSelected((prev) => {
        const next = new Set(prev);
        for (const c of filteredCategories) next.add(c);
        return next;
      });
    }
  };

  const handleSave = () => {
    saveMutation.mutate(Array.from(selected));
  };

  const hasChanges =
    localSelected !== null &&
    data &&
    (localSelected.size !== data.selected.length ||
      !data.selected.every((c) => localSelected.has(c)));

  return (
    <div className="space-y-3">
      {/* Search + controls */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter categories..."
          className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {selected.size} of {data.categories.length} selected
        </span>
      </div>

      {/* Select All / Deselect All */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleAll}
          className="px-3 py-1 text-xs rounded border border-gray-600 hover:border-gray-400 text-gray-300 transition-colors"
        >
          {allFilteredSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      {/* Checkboxes grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-80 overflow-y-auto pr-1">
        {filteredCategories.map((cat) => (
          <label
            key={cat}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={selected.has(cat)}
              onChange={() => toggleCategory(cat)}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-300 truncate" title={cat}>
              {cat}
            </span>
          </label>
        ))}
      </div>

      {/* Save */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-700">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saveMutation.isPending}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
        {saveMutation.isSuccess && (
          <span className="text-green-400 text-sm">Saved</span>
        )}
        {saveMutation.isError && (
          <span className="text-red-400 text-sm">Failed to save</span>
        )}
      </div>
    </div>
  );
}

export default function FiltersPanel() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("movies");
  const qc = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  const [excludeValue, setExcludeValue] = useState<string | null>(null);
  if (config && excludeValue === null) {
    setExcludeValue(config.exclude_categories ?? "");
  }

  const excludeMutation = useMutation({
    mutationFn: (val: string) => updateConfig({ exclude_categories: val }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config"] });
    },
  });

  return (
    <div className="max-w-3xl space-y-6">
      {/* Global exclude regex */}
      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        <h3 className="text-lg font-semibold mb-2">Global Exclude Categories</h3>
        <p className="text-sm text-gray-400 mb-3">
          Regex pattern. Categories matching this pattern are excluded from ALL Meilisearch
          indices (movies, series, TV listings).
        </p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={excludeValue ?? ""}
            onChange={(e) => setExcludeValue(e.target.value)}
            placeholder="^Server \d+|^VOD:"
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => excludeMutation.mutate(excludeValue ?? "")}
            disabled={excludeMutation.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors whitespace-nowrap"
          >
            {excludeMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
        {excludeMutation.isSuccess && (
          <span className="text-green-400 text-xs mt-1 inline-block">Saved</span>
        )}
        {excludeMutation.isError && (
          <span className="text-red-400 text-xs mt-1 inline-block">Failed to save</span>
        )}
      </section>

      {/* Category checkboxes by content type */}
      <section className="bg-gray-800 rounded-lg border border-gray-700 p-5">
        {/* Sub-tab bar */}
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

        <CategoryCheckboxes contentType={activeSubTab} />
      </section>
    </div>
  );
}
