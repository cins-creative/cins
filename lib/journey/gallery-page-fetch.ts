import "server-only";

import { cache } from "react";

import type {
  GalleryGridItem,
  GalleryPinnedBanner,
} from "@/components/journey/JourneyGalleryAside";
import type {
  MilestoneType,
  MilestoneVariant,
} from "@/components/journey/milestone-types";
import { journeyImageFields } from "@/lib/journey/images";
import { computeFilterCounts } from "@/lib/journey/milestone-filter-options";
import type { MilestoneFilterCounts } from "@/lib/journey/milestones-page-fetch";
import { attachPersonalFiltersToGalleryItems } from "@/lib/filter/attach-milestones";
import type { PersonalFilterRef } from "@/lib/filter/types";
import {
  collectGalleryStubs,
  resolveOwnerSlugs,
  type GalleryStub,
} from "@/lib/journey/gallery-stubs";
import {
  galleryItemLabel,
  type GalleryMediaKind,
} from "@/lib/journey/post-media";
import { loadVerifiedCotMocIdSet } from "@/lib/journey/milestone-verify";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const GALLERY_SCROLL_PAGE_SIZE = 24;
const GALLERY_ASIDE_LIMIT_PER_TYPE = 12;

export type GalleryMainPageResult = {
  items: GalleryMainItem[];
  offset: number;
  nextOffset: number;
  hasMore: boolean;
  totalCount: number;
  filterCounts: MilestoneFilterCounts;
};

export type GalleryMainItem = {
  id: string;
  cotMocId: string;
  personalFilterSlugs?: string[];
  personalFilters?: PersonalFilterRef[];
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
  label: string;
  href?: string;
  meta: string;
  featured: boolean;
  type: MilestoneType;
  variant: MilestoneVariant;
  mediaKind?: GalleryMediaKind;
  isVideo?: boolean;
  videoProcessing?: boolean;
};

const getGalleryStubsCached = cache(collectGalleryStubs);

async function withVerifiedGalleryVariants(
  stubs: GalleryStub[],
): Promise<GalleryStub[]> {
  if (stubs.length === 0) return stubs;
  const verifiedIds = await loadVerifiedCotMocIdSet(
    stubs.map((stub) => stub.cotMocId),
  );
  if (verifiedIds.size === 0) return stubs;
  return stubs.map((stub) =>
    verifiedIds.has(stub.cotMocId)
      ? { ...stub, variant: "verified" as const }
      : stub,
  );
}

type JourneyImageRole = Parameters<typeof journeyImageFields>[1];

function stubImageFields(
  entry: GalleryStub,
  role: JourneyImageRole,
): {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
} | null {
  if (entry.coverSrc) {
    return { src: entry.coverSrc, width: 800, height: 450 };
  }
  if (entry.coverId) {
    const img = journeyImageFields(entry.coverId, role);
    if (!img?.src) return null;
    return img;
  }
  return null;
}

function postHref(ownerSlug: string, postSlug: string | null): string {
  if (!postSlug) return `/${ownerSlug}`;
  return `/${ownerSlug}/p/${postSlug}`;
}

function formatVnDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function hydrateMainItems(
  stubs: GalleryStub[],
  ownerSlug: string,
  ownerSlugById: Map<string, string>,
): GalleryMainItem[] {
  const out: GalleryMainItem[] = [];
  stubs.forEach((entry, i) => {
    const featured = entry.visibility === "feature";
    const img = stubImageFields(entry, "milestone-preview");
    const isVideo = entry.mediaKind === "video";
    if (!img?.src && !isVideo) return;
    const slug = ownerSlugById.get(entry.postOwnerId) ?? ownerSlug;
    out.push({
      id: `${featured ? "pin" : "grid"}-${entry.cotMocId}-${i}`,
      cotMocId: entry.cotMocId,
      src: img?.src ?? "",
      srcSet: img?.srcSet,
      width: img?.width,
      height: img?.height,
      label: galleryItemLabel(entry.tieuDe, entry.mediaKind),
      href: postHref(slug, entry.tacPhamSlug),
      meta: entry.excerpt,
      featured,
      type: entry.type,
      variant: entry.variant,
      mediaKind: entry.mediaKind,
      isVideo,
      videoProcessing: entry.videoProcessing,
    });
  });
  return out;
}

function hydrateAsideItems(
  stubs: GalleryStub[],
  ownerSlug: string,
  ownerSlugById: Map<string, string>,
): {
  pinned: GalleryPinnedBanner[];
  items: GalleryGridItem[];
  totalTacPham: number;
} {
  const featureEntries = stubs
    .filter((x) => x.visibility === "feature")
    .slice(0, GALLERY_ASIDE_LIMIT_PER_TYPE);
  const publicEntries = stubs
    .filter((x) => x.visibility === "public")
    .slice(0, GALLERY_ASIDE_LIMIT_PER_TYPE);

  const pinned: GalleryPinnedBanner[] = [];
  featureEntries.forEach((entry, i) => {
    const img = stubImageFields(entry, "gallery-pinned");
    const isVideo = entry.mediaKind === "video";
    if (!img?.src && !isVideo) return;
    pinned.push({
      id: `pin-${entry.cotMocId}-${i}`,
      src: img?.src ?? "",
      srcSet: img?.srcSet,
      width: img?.width,
      height: img?.height,
      pin: "Nổi bật",
      title: galleryItemLabel(entry.tieuDe, entry.mediaKind),
      meta: formatVnDate(entry.thoiDiem),
      href: postHref(
        ownerSlugById.get(entry.postOwnerId) ?? ownerSlug,
        entry.tacPhamSlug,
      ),
      mediaKind: entry.mediaKind,
      isVideo,
      videoProcessing: entry.videoProcessing,
    });
  });

  const items: GalleryGridItem[] = [];
  publicEntries.forEach((entry, i) => {
    const img = stubImageFields(entry, "gallery-grid");
    const isVideo = entry.mediaKind === "video";
    if (!img?.src && !isVideo) return;
    items.push({
      id: `grid-${entry.cotMocId}-${i}`,
      src: img?.src ?? "",
      srcSet: img?.srcSet,
      width: img?.width,
      height: img?.height,
      label: galleryItemLabel(entry.tieuDe, entry.mediaKind),
      href: postHref(
        ownerSlugById.get(entry.postOwnerId) ?? ownerSlug,
        entry.tacPhamSlug,
      ),
      mediaKind: entry.mediaKind,
      isVideo,
      videoProcessing: entry.videoProcessing,
    });
  });

  return { pinned, items, totalTacPham: stubs.length };
}

export async function fetchGalleryTotalCount(userId: string): Promise<number> {
  const stubs = await getGalleryStubsCached(userId);
  return stubs.length;
}

export async function fetchGalleryMainPage(params: {
  userId: string;
  ownerSlug: string;
  offset?: number;
  limit?: number;
}): Promise<GalleryMainPageResult> {
  const { userId, ownerSlug } = params;
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.min(
    48,
    Math.max(1, params.limit ?? GALLERY_SCROLL_PAGE_SIZE),
  );

  const stubs = await withVerifiedGalleryVariants(
    await getGalleryStubsCached(userId),
  );
  const filterCounts = computeFilterCounts(stubs);
  const slice = stubs.slice(offset, offset + limit);

  const admin = createServiceRoleClient();
  const ownerIds = [...new Set(slice.map((x) => x.postOwnerId))];
  const ownerSlugById = await resolveOwnerSlugs(admin, ownerIds);
  const items = await attachPersonalFiltersToGalleryItems(
    hydrateMainItems(slice, ownerSlug, ownerSlugById),
  );

  const nextOffset = offset + items.length;
  return {
    items,
    offset,
    nextOffset,
    hasMore: nextOffset < stubs.length,
    totalCount: stubs.length,
    filterCounts,
  };
}

export async function fetchGalleryForUser(params: {
  userId: string;
  ownerSlug: string;
}): Promise<{
  pinned: GalleryPinnedBanner[];
  items: GalleryGridItem[];
  totalTacPham: number;
}> {
  const { userId, ownerSlug } = params;
  const stubs = await getGalleryStubsCached(userId);
  if (stubs.length === 0) {
    return { pinned: [], items: [], totalTacPham: 0 };
  }

  const admin = createServiceRoleClient();
  const ownerIds = [...new Set(stubs.map((x) => x.postOwnerId))];
  const ownerSlugById = await resolveOwnerSlugs(admin, ownerIds);
  return hydrateAsideItems(stubs, ownerSlug, ownerSlugById);
}
