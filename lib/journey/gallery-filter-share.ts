import type { FilterGroup } from "@/components/journey/JourneyTimelineBar";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  matchesPersonalFilterSlug,
  personalFilterSlugFromSearch,
} from "@/lib/filter/client-utils";
import type { GalleryDisplay } from "@/lib/journey/gallery-display-url";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import { filterByGroup } from "@/lib/journey/milestone-filter-options";
import { absoluteShareUrl } from "@/lib/journey/profile-share";

/** Nhãn dropdown filter timeline/gallery — dùng cho share URL + modal. */
export const FILTER_GROUP_LABELS: Record<FilterGroup, string> = {
  all: "Tất cả",
  hoc: "Học tập",
  lam: "Công việc",
  "du-an": "Dự án",
  "su-kien": "Sự kiện",
  "thanh-tuu": "Thành tựu",
  "ca-nhan": "Cá nhân",
  bookmark: "Lưu về",
  verified: "Verified",
  "cong-dong": "Cộng đồng",
};

/** Spec lọc gallery khi chia sẻ từ dropdown filter timeline / gallery. */
export type JourneyGalleryFilterShareSpec =
  | { kind: "all"; label: string }
  | { kind: "group"; group: FilterGroup; label: string }
  | { kind: "personal-label"; slug: string; label: string };

const VALID_GALLERY_GROUP = new Set<string>([
  "all",
  "hoc",
  "lam",
  "du-an",
  "su-kien",
  "thanh-tuu",
  "ca-nhan",
  "bookmark",
  "verified",
  "cong-dong",
]);

/** Token ngắn cho key OG snapshot / cache-bust (đồng bộ server + modal). */
export function shareFilterVersionToken(
  spec: JourneyGalleryFilterShareSpec | null | undefined,
): string | null {
  if (!spec || spec.kind === "all") return null;
  if (spec.kind === "group") return `g${spec.group}`;
  const slug = spec.slug.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  return slug ? `f${slug}` : null;
}

export function galleryGroupFromSearch(search: string): FilterGroup | null {
  const raw = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  )
    .get("nhom")
    ?.trim();
  if (!raw || !VALID_GALLERY_GROUP.has(raw) || raw === "all") return null;
  return raw as FilterGroup;
}

export function galleryFilterShareUrl(
  slug: string,
  spec: JourneyGalleryFilterShareSpec,
  display: GalleryDisplay = "card",
): string {
  const params = new URLSearchParams();
  params.set("view", "gallery");
  if (display === "grid") {
    params.set("display", "luoi");
  }
  if (spec.kind === "personal-label") {
    params.set("filter", spec.slug);
  } else if (spec.kind === "group" && spec.group !== "all") {
    params.set("nhom", spec.group);
  }
  const qs = params.toString();
  return absoluteShareUrl(`/${encodeURIComponent(slug)}?${qs}`);
}

/** Chia sẻ Portfolio toàn bộ — tương đương filter dropdown "Tất cả". */
export const PORTFOLIO_ALL_FILTER_SHARE_SPEC: JourneyGalleryFilterShareSpec = {
  kind: "all",
  label: "Tất cả",
};

/** Ghi `nhom` lên URL khi đổi filter nhóm (giữ các param khác, xóa nhãn riêng). */
export function buildGalleryGroupFilterSearchUrl(
  pathname: string,
  search: string,
  group: FilterGroup,
): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (group === "all") {
    params.delete("nhom");
  } else {
    params.set("nhom", group);
  }
  params.delete("filter");
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}

/** Đọc filter đang active từ query — dùng khi mở modal chia sẻ Portfolio. */
export function galleryFilterSpecFromSearch(
  search: string,
): JourneyGalleryFilterShareSpec {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const personalSlug = personalFilterSlugFromSearch(q);
  if (personalSlug) {
    return {
      kind: "personal-label",
      slug: personalSlug,
      label: personalSlug,
    };
  }
  const group = galleryGroupFromSearch(q);
  if (group) {
    return {
      kind: "group",
      group,
      label: FILTER_GROUP_LABELS[group],
    };
  }
  return PORTFOLIO_ALL_FILTER_SHARE_SPEC;
}

export type ShareGallerySourceItem = Pick<
  GalleryMainItem,
  "src" | "type" | "variant" | "personalFilterSlugs"
> & {
  visibility?: MilestoneItem["visibility"];
  /** Đồng bộ `GalleryMainItem.featured` khi có — dùng đếm Feature. */
  featured?: boolean;
  /** Frame đầu video khi `src` trống — dùng cho thumb share. */
  videoPreviewSrc?: string | null;
};

/** Banner Feature aside → nguồn thumb share (giữ đúng thứ tự index 1…n). */
export function featuredPinnedToShareSources(
  pinned: ReadonlyArray<{
    src?: string | null;
    videoPreviewSrc?: string | null;
    type?: MilestoneItem["type"];
    variant?: MilestoneItem["variant"];
    personalFilterSlugs?: GalleryMainItem["personalFilterSlugs"];
  }>,
): ShareGallerySourceItem[] {
  const out: ShareGallerySourceItem[] = [];
  for (const item of pinned) {
    const src = galleryItemThumbSrc(item);
    if (!src) continue;
    out.push({
      src,
      type: item.type ?? "du-an",
      variant: item.variant ?? "self",
      visibility: "feature",
      featured: true,
      personalFilterSlugs: item.personalFilterSlugs,
      videoPreviewSrc: item.videoPreviewSrc,
    });
  }
  return out;
}

/** URL thumb cho share card: ảnh cover trước, fallback preview video. */
export function galleryItemThumbSrc(
  item: {
    src?: string | null;
    videoPreviewSrc?: string | null;
  },
): string {
  return item.src?.trim() || item.videoPreviewSrc?.trim() || "";
}

export function milestonesToShareGalleryItems(
  milestones: ReadonlyArray<
    Pick<
      MilestoneItem,
      "type" | "variant" | "visibility" | "personalFilterSlugs" | "media"
    >
  >,
): ShareGallerySourceItem[] {
  const out: ShareGallerySourceItem[] = [];
  for (const m of milestones) {
    const src = m.media?.[0]?.src?.trim();
    if (!src) continue;
    out.push({
      src,
      type: m.type,
      variant: m.variant,
      visibility: m.visibility,
      featured: m.visibility === "feature",
      personalFilterSlugs: m.personalFilterSlugs,
    });
  }
  return out;
}

/** Gộp nguồn gallery — ưu tiên thứ tự, bỏ trùng URL thumb. */
export function mergeShareGallerySources(
  ...sources: ReadonlyArray<ReadonlyArray<ShareGallerySourceItem>>
): ShareGallerySourceItem[] {
  const seen = new Set<string>();
  const merged: ShareGallerySourceItem[] = [];
  for (const list of sources) {
    for (const item of list) {
      const src = galleryItemThumbSrc(item);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      merged.push({ ...item, src });
    }
  }
  return merged;
}

/** Trang đầu gallery + tổng thật — dùng cho share card (không lấy `items.length` làm count). */
export type GalleryShareFetchResult = {
  items: GalleryMainItem[];
  totalCount: number;
  featuredCount: number;
};

export async function fetchGalleryItemsForShare(
  slug: string,
): Promise<GalleryShareFetchResult> {
  const empty: GalleryShareFetchResult = {
    items: [],
    totalCount: 0,
    featuredCount: 0,
  };
  try {
    const res = await fetch(
      `/api/journey/${encodeURIComponent(slug)}/gallery?offset=0`,
      { cache: "no-store" },
    );
    if (!res.ok) return empty;
    const data = (await res.json()) as {
      items?: GalleryMainItem[];
      totalCount?: number;
      featuredCount?: number;
    };
    const items = data.items ?? [];
    return {
      items,
      totalCount:
        typeof data.totalCount === "number" ? data.totalCount : items.length,
      featuredCount:
        typeof data.featuredCount === "number"
          ? data.featuredCount
          : items.filter(
              (item) => item.visibility === "feature" || item.featured,
            ).length,
    };
  } catch {
    return empty;
  }
}

/**
 * Snapshot gallery đang render trên lưới — dùng khi mở share từ sidebar
 * (ngoài `JourneyFilterShareProvider`).
 */
let liveGalleryItemsForShare: ReadonlyArray<GalleryMainItem> = [];

export function setLiveGalleryItemsForShare(
  items: ReadonlyArray<GalleryMainItem>,
): void {
  liveGalleryItemsForShare = items;
}

export function getLiveGalleryItemsForShare(): ReadonlyArray<GalleryMainItem> {
  return liveGalleryItemsForShare;
}

/**
 * Cột Feature aside đang render (đã sort theo index) — ưu tiên thumb portfolio card.
 */
let liveFeaturedPinnedForShare: ReadonlyArray<{
  src?: string | null;
  videoPreviewSrc?: string | null;
  type?: MilestoneItem["type"];
  variant?: MilestoneItem["variant"];
}> = [];

export function setLiveFeaturedPinnedForShare(
  pinned: ReadonlyArray<{
    src?: string | null;
    videoPreviewSrc?: string | null;
    type?: MilestoneItem["type"];
    variant?: MilestoneItem["variant"];
  }>,
): void {
  liveFeaturedPinnedForShare = pinned;
}

export function getLiveFeaturedPinnedForShare(): ReadonlyArray<{
  src?: string | null;
  videoPreviewSrc?: string | null;
  type?: MilestoneItem["type"];
  variant?: MilestoneItem["variant"];
}> {
  return liveFeaturedPinnedForShare;
}

export function filterGalleryItemsForShare<T extends ShareGallerySourceItem>(
  items: ReadonlyArray<T>,
  spec: JourneyGalleryFilterShareSpec,
): T[] {
  if (spec.kind === "personal-label") {
    return items.filter((item) =>
      matchesPersonalFilterSlug(item.personalFilterSlugs, spec.slug),
    );
  }
  if (spec.kind === "group") {
    return filterByGroup(items, spec.group);
  }
  return [...items];
}

export function galleryThumbsForShareSpec(
  items: ReadonlyArray<ShareGallerySourceItem>,
  spec: JourneyGalleryFilterShareSpec,
  limit = 6,
): string[] {
  return filterGalleryItemsForShare(items, spec)
    .map(galleryItemThumbSrc)
    .filter(Boolean)
    .slice(0, limit);
}

/** Đóng dropdown filter timeline khi mở modal chia sẻ (tránh portal che click). */
export const JOURNEY_SHARE_OPEN_EVENT = "cins:journey-share-open";

export function dispatchJourneyShareOpen(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(JOURNEY_SHARE_OPEN_EVENT));
}
