"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { JourneyProfileView } from "@/components/journey/JourneySidebar";

function viewFromSearch(search: string): JourneyProfileView {
  const v = new URLSearchParams(search).get("view");
  if (v === "gallery" || v === "friends" || v === "organizations") return v;
  return "journey";
}

export function journeyHrefForView(
  slug: string,
  view: JourneyProfileView,
): string {
  return view === "journey"
    ? `/${encodeURIComponent(slug)}`
    : `/${encodeURIComponent(slug)}?view=${view}`;
}

type ContextValue = {
  view: JourneyProfileView;
  setView: (view: JourneyProfileView) => void;
  slug: string;
};

const JourneyViewContext = createContext<ContextValue | null>(null);

type ProviderProps = {
  initialView: JourneyProfileView;
  slug: string;
  children: ReactNode;
};

export function JourneyViewProvider({
  initialView,
  slug,
  children,
}: ProviderProps) {
  const [view, setViewState] = useState(initialView);

  useEffect(() => {
    setViewState(initialView);
  }, [initialView]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = viewFromSearch(window.location.search);
    setViewState((current) => (current === fromUrl ? current : fromUrl));
  }, []);

  const setView = useCallback(
    (next: JourneyProfileView) => {
      setViewState(next);
      const href = journeyHrefForView(slug, next);
      window.history.pushState({ journeyView: next }, "", href);
    },
    [slug],
  );

  useEffect(() => {
    const onPopState = () => {
      setViewState(viewFromSearch(window.location.search));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <JourneyViewContext.Provider value={{ view, setView, slug }}>
      {children}
    </JourneyViewContext.Provider>
  );
}

export function useJourneyView(): ContextValue {
  const ctx = useContext(JourneyViewContext);
  if (!ctx) {
    throw new Error("useJourneyView must be used within JourneyViewProvider");
  }
  return ctx;
}
