"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { GalleryMediaFilter } from "@/lib/journey/post-media";

type ContextValue = {
  mediaFilter: GalleryMediaFilter;
  setMediaFilter: (filter: GalleryMediaFilter) => void;
};

const JourneyFeaturedAsideFilterContext = createContext<ContextValue | null>(
  null,
);

export function JourneyFeaturedAsideFilterProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mediaFilter, setMediaFilterState] =
    useState<GalleryMediaFilter>("all");

  const setMediaFilter = useCallback((filter: GalleryMediaFilter) => {
    setMediaFilterState(filter);
  }, []);

  const value = useMemo(
    () => ({ mediaFilter, setMediaFilter }),
    [mediaFilter, setMediaFilter],
  );

  return (
    <JourneyFeaturedAsideFilterContext.Provider value={value}>
      {children}
    </JourneyFeaturedAsideFilterContext.Provider>
  );
}

export function useJourneyFeaturedAsideFilterOptional(): ContextValue | null {
  return useContext(JourneyFeaturedAsideFilterContext);
}
