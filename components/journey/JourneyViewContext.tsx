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
  if (
    v === "journey" ||
    v === "gallery" ||
    v === "friends" ||
    v === "organizations"
  ) {
    return v;
  }
  return "journey";
}

/** URL khi user chọn tab trên trang hồ sơ.
 *  Journey luôn gắn `?view=journey` (không dùng bare `/{slug}`) để refresh /
 *  like / comment không bị server áp lại chế độ mặc định của chủ trang. Bare
 *  `/{slug}` chỉ dành cho lần vào từ trang khác → loader mới redirect theo
 *  `journey_mac_dinh_view`. */
export function journeyHrefForView(
  slug: string,
  view: JourneyProfileView,
  baseSearch = "",
): string {
  const params = new URLSearchParams(
    baseSearch.startsWith("?") ? baseSearch.slice(1) : baseSearch,
  );
  params.set("view", view);
  // `display=luoi` chỉ có nghĩa trên Gallery.
  if (view !== "gallery") params.delete("display");
  const qs = params.toString();
  return `/${encodeURIComponent(slug)}?${qs}`;
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
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("view");
    const fromUrl = viewFromSearch(window.location.search);
    setViewState((current) => (current === fromUrl ? current : fromUrl));

    // Đang xem Journey nhưng URL còn bare (thiếu ?view=) — pin `?view=journey`
    // để F5 / router.refresh sau action không bị redirect về layout mặc định.
    if (initialView === "journey" && raw == null) {
      window.history.replaceState(
        { journeyView: "journey" },
        "",
        journeyHrefForView(slug, "journey", window.location.search),
      );
    }
  }, [initialView, slug]);

  const setView = useCallback(
    (next: JourneyProfileView) => {
      setViewState(next);
      const href = journeyHrefForView(slug, next, window.location.search);
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
