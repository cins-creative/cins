"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  buildPersonalFilterSearchUrl,
  personalFilterSlugFromSearch,
} from "@/lib/filter/client-utils";
import type { PersonalFilter } from "@/lib/filter/types";

type ContextValue = {
  ownerId: string;
  isOwner: boolean;
  filters: PersonalFilter[];
  activeSlug: string | null;
  setActiveSlug: (slug: string | null) => void;
  refreshFilters: () => Promise<void>;
  loading: boolean;
};

const JourneyPersonalFilterContext = createContext<ContextValue | null>(null);

type ProviderProps = {
  ownerId: string;
  isOwner: boolean;
  children: ReactNode;
};

export function JourneyPersonalFilterProvider({
  ownerId,
  isOwner,
  children,
}: ProviderProps) {
  const [filters, setFilters] = useState<PersonalFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlugState] = useState<string | null>(() =>
    typeof window !== "undefined"
      ? personalFilterSlugFromSearch(window.location.search)
      : null,
  );

  const refreshFilters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/filters?userId=${encodeURIComponent(ownerId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { filters: PersonalFilter[] };
      setFilters(data.filters ?? []);
    } catch {
      setFilters([]);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void refreshFilters();
  }, [refreshFilters]);

  useEffect(() => {
    const syncFromUrl = () => {
      setActiveSlugState(personalFilterSlugFromSearch(window.location.search));
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const setActiveSlug = useCallback((slug: string | null) => {
    setActiveSlugState(slug);
    const href = buildPersonalFilterSearchUrl(
      window.location.pathname,
      window.location.search,
      slug,
    );
    window.history.replaceState(window.history.state, "", href);
  }, []);

  const value = useMemo(
    () => ({
      ownerId,
      isOwner,
      filters,
      activeSlug,
      setActiveSlug,
      refreshFilters,
      loading,
    }),
    [ownerId, isOwner, filters, activeSlug, setActiveSlug, refreshFilters, loading],
  );

  return (
    <JourneyPersonalFilterContext.Provider value={value}>
      {children}
    </JourneyPersonalFilterContext.Provider>
  );
}

export function useJourneyPersonalFilter(): ContextValue {
  const ctx = useContext(JourneyPersonalFilterContext);
  if (!ctx) {
    throw new Error(
      "useJourneyPersonalFilter must be used within JourneyPersonalFilterProvider",
    );
  }
  return ctx;
}

export function useJourneyPersonalFilterOptional(): ContextValue | null {
  return useContext(JourneyPersonalFilterContext);
}
