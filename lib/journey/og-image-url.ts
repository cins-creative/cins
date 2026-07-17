import type { ShareOgTheme } from "@/lib/journey/share-og-theme";

/** Query ảnh hưởng OG trên `/{slug}` (không gồm `v=` / `display`). */
export type OgShareSearch = {
  view?: string | null;
  nhom?: string | null;
  filter?: string | null;
  /** Identity riêng cho page share; không ảnh hưởng nội dung/URL ảnh OG. */
  s?: string | null;
};

/** Build query string từ params share (không gồm `v=`). */
export function buildOgShareSearchParams(
  search: OgShareSearch,
): URLSearchParams {
  const params = new URLSearchParams();
  if (search.view === "gallery") params.set("view", "gallery");
  const filter = search.filter?.trim();
  const nhom = search.nhom?.trim();
  if (filter) {
    params.set("filter", filter);
  } else if (nhom && nhom !== "all") {
    params.set("nhom", nhom);
  }
  return params;
}

/** Query cho `og:url`: giữ thêm token share để Facebook coi là object mới. */
export function buildOgPageSearchParams(
  search: OgShareSearch,
): URLSearchParams {
  const params = buildOgShareSearchParams(search);
  const shareToken = search.s?.trim();
  if (shareToken && /^[A-Za-z0-9_-]{10,24}$/.test(shareToken)) {
    params.set("s", shareToken);
  }
  return params;
}

/**
 * Token phiên bản OG — layout + filter + theme.
 * Đổi bất kỳ cái nào → URL ảnh đổi (`v=`), cache cũ tự invalidate.
 */
export function buildOgImageVersion(
  theme: ShareOgTheme | null | undefined,
  layout: string | null | undefined,
  filterVersion: string | null | undefined,
): string | null {
  const parts: string[] = [];
  if (layout) parts.push(`l${layout}`);
  if (filterVersion) parts.push(filterVersion);
  if (theme) {
    if (theme.kind === "custom") {
      parts.push(
        `c${theme.imageId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`,
      );
    } else {
      parts.push(`p${theme.id}`);
    }
  }
  return parts.length > 0 ? parts.join("-") : null;
}

/** Path tương đối `/{slug}/opengraph-image?...&v=` — khớp metadata server. */
export function buildJourneyOgImagePath(
  slug: string,
  search: OgShareSearch,
  version: string | null,
): string {
  const params = buildOgShareSearchParams(search);
  if (version) params.set("v", version);
  const qs = params.toString();
  const base = `/${encodeURIComponent(slug)}/opengraph-image`;
  return qs ? `${base}?${qs}` : base;
}

export function buildJourneyOgImageAbsoluteUrl(
  origin: string,
  slug: string,
  search: OgShareSearch,
  version: string | null,
): string {
  const base = origin.replace(/\/$/, "") || "https://cins.vn";
  return `${base}${buildJourneyOgImagePath(slug, search, version)}`;
}

/**
 * Fire-and-forget: GET URL on-demand OG để warm CF / Worker cache
 * trước khi bot scrape. Preview DOM trong modal không hit URL này.
 */
export function warmOgImageCache(absoluteUrl: string): void {
  const url = absoluteUrl.trim();
  if (!url || typeof fetch === "undefined") return;
  void fetch(url, {
    method: "GET",
    credentials: "omit",
    /* Browser không tái dùng cache local; response Cache-Control vẫn cho CF lưu. */
    cache: "no-store",
  }).catch(() => {
    /* best-effort */
  });
}

/** Cache-Control cho PNG OG — an toàn vì `v=` là content key. */
export const OG_IMAGE_CACHE_CONTROL =
  "public, max-age=31536000, immutable";

/** Gỡ Vary RSC (chặn CF cache) + gắn Cache-Control dài hạn. */
export function withOgImageCacheHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.delete("vary");
  headers.delete("Vary");
  headers.set("Cache-Control", OG_IMAGE_CACHE_CONTROL);
  /* CDN / Worker đôi khi ưu tiên header này hơn Cache-Control app. */
  headers.set("CDN-Cache-Control", OG_IMAGE_CACHE_CONTROL);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
