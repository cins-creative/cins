import { createCachedResource } from "@/lib/client-cache";
import { fetchGifFeatured, fetchGifSearch } from "@/lib/gif/client";
import {
  GIF_FEATURED_CACHE_LIMIT,
  GIF_FEATURED_CACHE_TTL_MS,
} from "@/lib/gif/constants";
import type { GifPage, GifResult } from "@/lib/gif/types";

function isGifResult(value: unknown): value is GifResult {
  if (value == null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    row.id.trim().length > 0 &&
    typeof row.previewUrl === "string" &&
    row.previewUrl.startsWith("https://") &&
    typeof row.url === "string" &&
    row.url.startsWith("https://")
  );
}

function validateGifPage(raw: unknown): GifPage | null {
  if (raw == null || typeof raw !== "object") return null;
  const page = raw as { items?: unknown; next?: unknown };
  if (!Array.isArray(page.items)) return null;
  const items = page.items.filter(isGifResult).slice(0, GIF_FEATURED_CACHE_LIMIT);
  if (items.length === 0) return null;
  const next =
    typeof page.next === "string" && page.next.trim() ? page.next.trim() : null;
  return { items, next };
}

function warmGifPreviews(items: ReadonlyArray<GifResult>) {
  if (typeof window === "undefined") return;
  for (const item of items.slice(0, GIF_FEATURED_CACHE_LIMIT)) {
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.decoding = "async";
    img.src = item.previewUrl;
  }
}

const gifFeaturedCache = createCachedResource<GifPage>({
  keyPrefix: "gif:featured",
  ttlMs: GIF_FEATURED_CACHE_TTL_MS,
  persist: "session",
  validate: validateGifPage,
  fetcher: async () => {
    const page = await fetchGifFeatured();
    const sliced = {
      items: page.items.slice(0, GIF_FEATURED_CACHE_LIMIT),
      next: page.next,
    };
    warmGifPreviews(sliced.items);
    return sliced;
  },
});

const gifSearchCache = createCachedResource<GifPage, [string]>({
  keyPrefix: "gif:search",
  ttlMs: 2 * 60_000,
  keyFromArgs: (q) => q.trim().toLowerCase(),
  fetcher: (q) => fetchGifSearch({ q }),
});

export function peekGifFeatured(): GifPage | null {
  const page = gifFeaturedCache.peek();
  if (page) warmGifPreviews(page.items);
  return page;
}

export function peekGifSearch(q: string): GifPage | null {
  const query = q.trim();
  if (!query) return peekGifFeatured();
  return gifSearchCache.peek(query);
}

export async function fetchGifFeaturedCached(): Promise<GifPage> {
  return gifFeaturedCache.fetch();
}

export async function fetchGifSearchCached(q: string): Promise<GifPage> {
  const query = q.trim();
  if (!query) return fetchGifFeaturedCached();
  return gifSearchCache.fetch(query);
}

export function prefetchGifFeatured() {
  gifFeaturedCache.prefetch();
}

let hoverBound = false;

/** Prefetch featured khi hover nút meme — picker mở là có ảnh sẵn. */
export function ensureGifPrefetchOnStickerHover() {
  if (hoverBound || typeof window === "undefined") return;
  hoverBound = true;
  document.addEventListener(
    "pointerenter",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-sticker-trigger]")) prefetchGifFeatured();
    },
    true,
  );
}
