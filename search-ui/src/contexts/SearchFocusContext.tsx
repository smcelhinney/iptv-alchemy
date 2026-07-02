import { createContext, useContext, useEffect, useRef } from "react";
import { registerNode, unregisterNode } from "../lib/spatial-navigation";

interface SearchFocusContextValue {
  registerSearchInput: (ref: HTMLInputElement | null) => void;
}

const SearchFocusContext = createContext<SearchFocusContextValue | null>(null);

export function SearchFocusProvider({ children }: { children: React.ReactNode }) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const registerSearchInput = (ref: HTMLInputElement | null) => {
    // Unregister previous node
    if (searchInputRef.current) {
      unregisterNode("search-input");
    }

    searchInputRef.current = ref;

    // Register with spatial navigation so D-pad can navigate to/from the input
    if (ref) {
      registerNode({
        id: "search-input",
        element: ref,
        getRect: () => ref.getBoundingClientRect(),
        onFocus: () => {},
        onBlur: () => {},
        onActivate: () => {
          // Focus the input so the user can type
          ref.focus();
        },
        focusGroup: "header",
      });
    }
  };

  // Expose a global function to focus the search input
  (window as unknown as { focusSearchInput: () => void }).focusSearchInput = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unregisterNode("search-input");
    };
  }, []);

  return (
    <SearchFocusContext.Provider value={{ registerSearchInput }}>
      {children}
    </SearchFocusContext.Provider>
  );
}

export function useSearchFocus() {
  const context = useContext(SearchFocusContext);
  if (!context) {
    throw new Error("useSearchFocus must be used within SearchFocusProvider");
  }
  return context;
}
