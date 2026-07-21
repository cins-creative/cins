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
import type { ContentSurfaceView } from "@/lib/cins/content-surface-view";
import {
  galleryDisplayFromSearch,
  galleryDisplayHref,
  type GalleryDisplay,
} from "@/lib/journey/gallery-display-url";
import { shopPublicHref } from "@/lib/shop/cua-hang-href";

function slugSegmentMatches(segment: string, slug: string): boolean {
  try {
    return decodeURIComponent(segment) === slug;
  } catch {
    return segment === slug;
  }
}

/** `/{slug}/shop` hoặc `/{slug}/shop/...` (vd. loại hàng). */
function isShopPathname(pathname: string, slug: string): boolean {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length < 2) return false;
  if (segments[1] !== "shop") return false;
  return slugSegmentMatches(segments[0]!, slug);
}

/** Đúng root storefront `/{slug}/shop` — không gồm `/shop/loai/...`. */
function isShopRootPathname(pathname: string, slug: string): boolean {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length !== 2) return false;
  if (segments[1] !== "shop") return false;
  return slugSegmentMatches(segments[0]!, slug);
}

/** Id loại hàng từ `/{slug}/shop/loai/[nhomId]`. */
export function shopNhomIdFromPathname(
  pathname: string,
  slug: string,
): string | null {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length < 4) return null;
  if (segments[1] !== "shop" || segments[2] !== "loai") return null;
  if (!slugSegmentMatches(segments[0]!, slug)) return null;
  try {
    return decodeURIComponent(segments[3]!) || null;
  } catch {
    return segments[3] || null;
  }
}

function viewFromLocation(
  pathname: string,
  search: string,
  slug: string,
): JourneyProfileView {
  if (isShopPathname(pathname, slug)) return "shop";
  const v = new URLSearchParams(search).get("view");
  if (
    v === "journey" ||
    v === "gallery" ||
    v === "friends" ||
    v === "organizations" ||
    v === "shop"
  ) {
    return v;
  }
  return "journey";
}

/** Chỉ pin `?view=journey` trên bare `/{slug}` — không đụng `/` (World Journey). */
function isBareProfilePath(pathname: string, slug: string): boolean {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length !== 1) return false;
  const segment = segments[0]!;
  try {
    return decodeURIComponent(segment) === slug;
  } catch {
    return segment === slug;
  }
}

/** URL khi user chọn tab trên trang hồ sơ.
 *  Journey luôn gắn `?view=journey` (không dùng bare `/{slug}`) để refresh /
 *  like / comment không bị server áp lại chế độ mặc định của chủ trang. Bare
 *  `/{slug}` chỉ dành cho lần vào từ trang khác → loader mới redirect theo
 *  `journey_mac_dinh_view`.
 *  Shop = path riêng `/{slug}/shop` (chia sẻ storefront độc lập). */
export function journeyHrefForView(
  slug: string,
  view: JourneyProfileView,
  baseSearch = "",
): string {
  if (view === "shop") {
    return shopPublicHref(slug);
  }
  const params = new URLSearchParams(
    baseSearch.startsWith("?") ? baseSearch.slice(1) : baseSearch,
  );
  params.set("view", view);
  // `display=luoi` chỉ có nghĩa trên Gallery.
  if (view !== "gallery") params.delete("display");
  const qs = params.toString();
  return `/${encodeURIComponent(slug)}?${qs}`;
}

/** Map URL hồ sơ → cụm 3 view (timeline · dạng thẻ · lưới gọn). */
export function contentSurfaceFromProfile(
  view: JourneyProfileView,
  search: string,
): ContentSurfaceView {
  if (view !== "gallery") return "timeline";
  return galleryDisplayFromSearch(search) === "grid" ? "masonry" : "grid";
}

function galleryDisplayForSurface(
  surface: Exclude<ContentSurfaceView, "timeline">,
): GalleryDisplay {
  return surface === "masonry" ? "grid" : "card";
}

type ContextValue = {
  view: JourneyProfileView;
  setView: (view: JourneyProfileView) => void;
  /** Chế độ xem nội dung đang active trên Journey/Gallery. */
  contentSurface: ContentSurfaceView;
  setContentSurface: (surface: ContentSurfaceView) => void;
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
  const [contentSurface, setContentSurfaceState] = useState<ContentSurfaceView>(
    () =>
      contentSurfaceFromProfile(
        initialView,
        typeof window !== "undefined" ? window.location.search : "",
      ),
  );

  useEffect(() => {
    setViewState(initialView);
    setContentSurfaceState(
      contentSurfaceFromProfile(
        initialView,
        typeof window !== "undefined" ? window.location.search : "",
      ),
    );
  }, [initialView]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("view");
    const fromUrl = viewFromLocation(
      window.location.pathname,
      window.location.search,
      slug,
    );
    setViewState((current) => (current === fromUrl ? current : fromUrl));
    setContentSurfaceState(
      contentSurfaceFromProfile(fromUrl, window.location.search),
    );

    // Đang xem Journey trên bare `/{slug}` (thiếu ?view=) — pin `?view=journey`
    // để F5 / router.refresh sau action không bị redirect về layout mặc định.
    // Không pin khi đang ở trang chủ `/` (World Journey cũng dùng provider/reuse).
    if (
      initialView === "journey" &&
      raw == null &&
      isBareProfilePath(window.location.pathname, slug)
    ) {
      window.history.replaceState(
        { journeyView: "journey" },
        "",
        journeyHrefForView(slug, "journey", window.location.search),
      );
    }
  }, [initialView, slug]);

  const setView = useCallback(
    (next: JourneyProfileView) => {
      const href = journeyHrefForView(slug, next, window.location.search);
      const onShop = isShopPathname(window.location.pathname, slug);
      const onShopRoot = isShopRootPathname(window.location.pathname, slug);
      /* Shop là path riêng nhưng cùng shell hồ sơ — soft pushState như tab
         Gallery/Friends, tránh router.push remount + fetch owner lại. */
      if (next === "shop" || onShop) {
        if (next === "shop" && onShopRoot) return;
        setViewState(next);
        setContentSurfaceState(
          contentSurfaceFromProfile(next, window.location.search),
        );
        window.history.pushState({ journeyView: next }, "", href);
        window.dispatchEvent(
          new CustomEvent("cins:journey-path", {
            detail: { pathname: new URL(href, window.location.origin).pathname },
          }),
        );
        return;
      }
      setViewState(next);
      setContentSurfaceState(
        contentSurfaceFromProfile(next, window.location.search),
      );
      window.history.pushState({ journeyView: next }, "", href);
    },
    [slug],
  );

  const setContentSurface = useCallback(
    (surface: ContentSurfaceView) => {
      if (isShopPathname(window.location.pathname, slug)) {
        if (surface === "timeline") {
          setViewState("journey");
          setContentSurfaceState("timeline");
          const href = journeyHrefForView(slug, "journey", window.location.search);
          window.history.pushState({ journeyView: "journey" }, "", href);
          window.dispatchEvent(
            new CustomEvent("cins:journey-path", {
              detail: {
                pathname: new URL(href, window.location.origin).pathname,
              },
            }),
          );
          return;
        }
        const display = galleryDisplayForSurface(surface);
        setViewState("gallery");
        setContentSurfaceState(surface);
        const href = galleryDisplayHref(slug, display, window.location.search);
        window.history.pushState(
          { journeyView: "gallery", galleryDisplay: display },
          "",
          href,
        );
        window.dispatchEvent(
          new CustomEvent("cins:gallery-display", { detail: display }),
        );
        window.dispatchEvent(
          new CustomEvent("cins:journey-path", {
            detail: {
              pathname: new URL(href, window.location.origin).pathname,
            },
          }),
        );
        return;
      }
      if (surface === "timeline") {
        setViewState("journey");
        setContentSurfaceState("timeline");
        const href = journeyHrefForView(slug, "journey", window.location.search);
        window.history.pushState({ journeyView: "journey" }, "", href);
        return;
      }
      const display = galleryDisplayForSurface(surface);
      setViewState("gallery");
      setContentSurfaceState(surface);
      const href = galleryDisplayHref(slug, display, window.location.search);
      window.history.pushState(
        { journeyView: "gallery", galleryDisplay: display },
        "",
        href,
      );
      window.dispatchEvent(
        new CustomEvent("cins:gallery-display", { detail: display }),
      );
    },
    [slug],
  );

  useEffect(() => {
    const onPopState = () => {
      const nextView = viewFromLocation(
        window.location.pathname,
        window.location.search,
        slug,
      );
      setViewState(nextView);
      setContentSurfaceState(
        contentSurfaceFromProfile(nextView, window.location.search),
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [slug]);

  return (
    <JourneyViewContext.Provider
      value={{ view, setView, contentSurface, setContentSurface, slug }}
    >
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

export function useJourneyViewOptional(): ContextValue | null {
  return useContext(JourneyViewContext);
}
