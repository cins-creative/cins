import "server-only";

import { cache } from "react";

import type {
  GalleryGridItem,
  GalleryPinnedBanner,
} from "@/components/journey/JourneyGalleryAside";
import type {
  MilestoneType,
  MilestoneVariant,
  MilestoneCardLayout,
} from "@/components/journey/milestone-types";
import type { FeedSourceKind } from "@/lib/cins/worldJourneyFeedSource";
import { journeyImageFields } from "@/lib/journey/images";
import { computeFilterCounts } from "@/lib/journey/milestone-filter-options";
import type { MilestoneFilterCounts } from "@/lib/journey/milestones-page-fetch";
import { attachPersonalFiltersToGalleryItems } from "@/lib/filter/attach-milestones";
import type { PersonalFilterRef } from "@/lib/filter/types";
import {
  fetchGalleryNoiBatOrderMap,
  sortPinnedByNoiBatOrder,
} from "@/lib/journey/gallery-noi-bat-order";
import {
  collectGalleryStubs,
  resolveOwnerProfiles,
  type GalleryStub,
  type OwnerProfile,
} from "@/lib/journey/gallery-stubs";
import {
  galleryItemLabel,
  type GalleryMediaKind,
} from "@/lib/journey/post-media";
import type { EmbedProviderId } from "@/lib/editor/embed-providers";
import { loadCoAuthorCredits } from "@/lib/journey/coauthor-credits";
import {
  resolveGallerySourceAuthor,
  type GallerySourcePerson,
} from "@/lib/journey/gallery-source-author";
import { loadVerifiedCotMocIdSet } from "@/lib/journey/milestone-verify";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { loadOrgBaiDangCoAuthorCredits } from "@/lib/truong/org-bai-dang-coauthor";
import type { CoAuthorCredit } from "@/components/journey/milestone-types";
import type { VideoCanvasRatio } from "@/lib/journey/video-canvas-ratio";
import { videoPreviewDimensionsFromRatio } from "@/lib/journey/video-canvas-ratio";
import { hideProcessingVideoFromViewer } from "@/lib/journey/video-processing-meta";

export const GALLERY_SCROLL_PAGE_SIZE = 24;
/** Aside nổi bật / grid public — đủ để người khác scan nhanh profile. */
const GALLERY_ASIDE_LIMIT_PER_TYPE = 24;

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
  /** Chế độ hiển thị — menu chủ gallery; gallery public chỉ có feature/public. */
  visibility?: "feature" | "public";
  /** Slug tác phẩm — menu chủ (sửa / permalink). */
  postSlug?: string | null;
  /** Slug chủ bài (permalink) khi khác profile đang xem. */
  postOwnerSlug?: string | null;
  /** Tác phẩm — menu đổi hiển thị tagged/bookmark trên Journey viewer. */
  tacPhamId?: string | null;
  variant: MilestoneVariant;
  mediaKind?: GalleryMediaKind;
  /** Logo góc thumb — YouTube, Figma, Rive, … */
  embedProvider?: EmbedProviderId | null;
  isVideo?: boolean;
  videoProcessing?: boolean;
  /** MP4 Bunny — frame đầu khi thumbnail thiếu/lỗi. */
  videoPreviewSrc?: string | null;
  cardLayout?: MilestoneCardLayout;
  orgAvatarUrl?: string | null;
  orgKicker?: string | null;
  verifierRole?: string | null;
  /** Tác giả hiển thị trên overlay hover của card gallery. */
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  /** Stack avatar góc thumb — giống banner pinned. */
  showSourceAuthor?: boolean;
  sourcePeople?: GallerySourcePerson[];
  videoCanvasRatio?: VideoCanvasRatio;
  /**
   * World Journey — nguồn nội dung để lọc theo `FeedSourceFilter`
   * (`user` / `cong_dong` / `org`). Gắn ở server khi dựng pool trang chủ.
   */
  feedSource?: FeedSourceKind;
  /** World Journey — item đến từ quan hệ theo dõi (mình / bạn bè / theo dõi / thành viên). */
  feedFollowing?: boolean;
  /**
   * World Journey — đang editorial boost (L29). Chỉ dùng UI admin; không badge viewer.
   */
  worldBoosted?: boolean;
};

const getGalleryStubsCached = cache(collectGalleryStubs);

function filterGalleryStubsForViewer(
  stubs: GalleryStub[],
  viewerId: string | null | undefined,
  ownerUserId: string,
): GalleryStub[] {
  if (!viewerId || viewerId === ownerUserId) return stubs;
  return stubs.filter((stub) => !stub.videoProcessing);
}

/** Thứ tự ưu tiên gallery: Nổi bật & Xác thực → Nổi bật → Xác thực → còn lại. */
function galleryPriorityRank(stub: GalleryStub): number {
  const featured = stub.visibility === "feature";
  const verified = stub.variant === "verified";
  if (featured && verified) return 0;
  if (featured) return 1;
  if (verified) return 2;
  return 3;
}

/** Sort ổn định: ưu tiên Nổi bật/Xác thực, trong nhóm theo `tao_luc` mới nhất. */
function sortGalleryByPriority(stubs: GalleryStub[]): GalleryStub[] {
  return stubs
    .map((stub, index) => ({ stub, index }))
    .sort((a, b) => {
      const rank = galleryPriorityRank(a.stub) - galleryPriorityRank(b.stub);
      if (rank !== 0) return rank;
      if (a.stub.taoLuc !== b.stub.taoLuc) {
        return a.stub.taoLuc > b.stub.taoLuc ? -1 : 1;
      }
      if (a.stub.thoiDiem !== b.stub.thoiDiem) {
        return a.stub.thoiDiem > b.stub.thoiDiem ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.stub);
}

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
  if (entry.mediaKind === "video" && entry.coverId) {
    const custom = journeyImageFields(entry.coverId, role);
    if (custom?.src) {
      const dims = videoPreviewDimensionsFromRatio(entry.videoCanvasRatio);
      return {
        src: custom.src,
        srcSet: custom.srcSet,
        width: dims.width,
        height: dims.height,
      };
    }
  }
  if (entry.coverSrc) {
    if (entry.mediaKind === "video") {
      const dims = videoPreviewDimensionsFromRatio(entry.videoCanvasRatio);
      return { src: entry.coverSrc, width: dims.width, height: dims.height };
    }
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

function isOrgCreateGalleryStub(entry: GalleryStub): boolean {
  return (
    entry.cardLayout === "cong-dong-create" ||
    entry.cardLayout === "co-so-create" ||
    entry.cardLayout === "studio-create"
  );
}

function galleryStubHref(
  entry: GalleryStub,
  ownerSlug: string,
  ownerSlugById: Map<string, string>,
): string | undefined {
  if (isOrgCreateGalleryStub(entry)) return entry.orgHref ?? undefined;
  if (entry.orgHref && !entry.tacPhamSlug) return entry.orgHref;
  const slug = ownerSlugById.get(entry.postOwnerId) ?? ownerSlug;
  return postHref(slug, entry.tacPhamSlug);
}

function hydrateMainItems(
  stubs: GalleryStub[],
  ownerSlug: string,
  journeyOwnerId: string,
  ownerSlugById: Map<string, string>,
  ownerProfileById?: Map<string, OwnerProfile>,
  creditsByTacPham?: Map<string, CoAuthorCredit[]>,
  creditsByOrgPost?: Map<string, CoAuthorCredit[]>,
): GalleryMainItem[] {
  const out: GalleryMainItem[] = [];
  stubs.forEach((entry, i) => {
    const featured = entry.visibility === "feature";
    const isOrgCreate = isOrgCreateGalleryStub(entry);
    const img = stubImageFields(entry, "milestone-preview");
    const isVideo = entry.mediaKind === "video";
    if (!isOrgCreate && !img?.src && !isVideo) return;
    const slug = ownerSlugById.get(entry.postOwnerId) ?? ownerSlug;
    const ownerProfile = ownerProfileById?.get(entry.postOwnerId);
    const href = galleryStubHref(entry, ownerSlug, ownerSlugById);
    const isOrgPost = Boolean(entry.orgHref && !entry.tacPhamSlug && !isOrgCreate);
    const credits = isOrgCreate
      ? []
      : isOrgPost
        ? (creditsByOrgPost?.get(entry.tacPhamId) ?? [])
        : (creditsByTacPham?.get(entry.tacPhamId) ?? []);
    const sourceAuthor = isOrgCreate
      ? null
      : resolveGallerySourceAuthor(
          entry,
          journeyOwnerId,
          ownerProfile,
          credits,
        );
    const fallbackAuthorName =
      isOrgCreate || isOrgPost
        ? (entry.orgKicker ?? null)
        : (ownerProfile?.name ?? null);
    const fallbackAuthorAvatar =
      isOrgCreate || isOrgPost
        ? (entry.orgAvatarUrl ?? null)
        : (ownerProfile?.avatarUrl ?? null);
    out.push({
      id: `${featured ? "pin" : "grid"}-${entry.cotMocId}-${i}`,
      cotMocId: entry.cotMocId,
      src: img?.src ?? "",
      srcSet: img?.srcSet,
      width: img?.width,
      height: img?.height,
      label: isOrgCreate
        ? entry.tieuDe
        : galleryItemLabel(entry.tieuDe, entry.mediaKind),
      href,
      meta: entry.excerpt,
      featured,
      type: entry.type,
      visibility: entry.visibility,
      postSlug: isOrgCreate || isOrgPost ? null : entry.tacPhamSlug,
      postOwnerSlug: isOrgCreate || isOrgPost ? null : slug,
      tacPhamId: isOrgCreate ? null : entry.tacPhamId,
      variant: entry.variant,
      mediaKind: entry.mediaKind,
      embedProvider: entry.embedProvider ?? null,
      isVideo,
      videoProcessing: entry.videoProcessing,
      videoPreviewSrc: entry.videoPreviewSrc,
      cardLayout: entry.cardLayout,
      orgAvatarUrl: entry.orgAvatarUrl,
      orgKicker: entry.orgKicker,
      verifierRole: entry.verifierRole,
      authorName: sourceAuthor?.showCorner
        ? sourceAuthor.name
        : fallbackAuthorName,
      authorAvatarUrl: sourceAuthor?.showCorner
        ? sourceAuthor.avatarUrl
        : fallbackAuthorAvatar,
      showSourceAuthor: sourceAuthor?.showCorner ?? false,
      sourcePeople: sourceAuthor?.showCorner ? sourceAuthor.people : undefined,
      videoCanvasRatio: entry.videoCanvasRatio,
    });
  });
  return out;
}

function hydrateAsideItems(
  stubs: GalleryStub[],
  ownerSlug: string,
  journeyOwnerId: string,
  ownerSlugById: Map<string, string>,
  ownerProfileById?: Map<string, OwnerProfile>,
  noiBatOrder?: Map<string, number>,
  creditsByTacPham?: Map<string, CoAuthorCredit[]>,
  creditsByOrgPost?: Map<string, CoAuthorCredit[]>,
): {
  pinned: GalleryPinnedBanner[];
  items: GalleryGridItem[];
  totalTacPham: number;
} {
  // Mặc định: bài đăng mới nhất (tao_luc) lên trước — không theo năm thoi_diem.
  const featureNewestFirst = stubs
    .filter((x) => x.visibility === "feature")
    .slice()
    .sort((a, b) => {
      if (a.taoLuc !== b.taoLuc) return a.taoLuc > b.taoLuc ? -1 : 1;
      return a.thoiDiem > b.thoiDiem ? -1 : a.thoiDiem < b.thoiDiem ? 1 : 0;
    });
  const featureEntries = sortPinnedByNoiBatOrder(
    featureNewestFirst,
    noiBatOrder ?? new Map(),
  ).slice(0, GALLERY_ASIDE_LIMIT_PER_TYPE);
  const publicEntries = stubs
    .filter((x) => x.visibility === "public")
    .slice(0, GALLERY_ASIDE_LIMIT_PER_TYPE);

  const pinned: GalleryPinnedBanner[] = [];
  featureEntries.forEach((entry, i) => {
    const img = stubImageFields(entry, "gallery-pinned");
    const isVideo = entry.mediaKind === "video";
    if (!img?.src && !isVideo) return;
    const ownerProfile = ownerProfileById?.get(entry.postOwnerId);
    const isOrgPost = Boolean(entry.orgHref && !entry.tacPhamSlug);
    const credits = isOrgPost
      ? (creditsByOrgPost?.get(entry.tacPhamId) ?? [])
      : (creditsByTacPham?.get(entry.tacPhamId) ?? []);
    const sourceAuthor = resolveGallerySourceAuthor(
      entry,
      journeyOwnerId,
      ownerProfile,
      credits,
    );
    pinned.push({
      id: `pin-${entry.cotMocId}-${i}`,
      cotMocId: entry.cotMocId,
      src: img?.src ?? "",
      srcSet: img?.srcSet,
      width: img?.width,
      height: img?.height,
      pin: "Nổi bật",
      title: galleryItemLabel(entry.tieuDe, entry.mediaKind),
      meta: entry.excerpt,
      authorName: sourceAuthor.showCorner ? sourceAuthor.name : null,
      authorAvatarUrl: sourceAuthor.showCorner ? sourceAuthor.avatarUrl : null,
      showSourceAuthor: sourceAuthor.showCorner,
      sourcePeople: sourceAuthor.showCorner ? sourceAuthor.people : undefined,
      href: galleryStubHref(entry, ownerSlug, ownerSlugById),
      mediaKind: entry.mediaKind,
      embedProvider: entry.embedProvider ?? null,
      isVideo,
      videoProcessing: entry.videoProcessing,
      videoPreviewSrc: entry.videoPreviewSrc,
    });
  });

  const items: GalleryGridItem[] = [];
  publicEntries.forEach((entry, i) => {
    const img = stubImageFields(entry, "gallery-grid");
    const isVideo = entry.mediaKind === "video";
    if (!img?.src && !isVideo) return;
    items.push({
      id: `grid-${entry.cotMocId}-${i}`,
      cotMocId: entry.cotMocId,
      src: img?.src ?? "",
      srcSet: img?.srcSet,
      width: img?.width,
      height: img?.height,
      label: galleryItemLabel(entry.tieuDe, entry.mediaKind),
      href: galleryStubHref(entry, ownerSlug, ownerSlugById),
      mediaKind: entry.mediaKind,
      embedProvider: entry.embedProvider ?? null,
      isVideo,
      videoProcessing: entry.videoProcessing,
      videoPreviewSrc: entry.videoPreviewSrc,
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
  viewerId?: string | null;
  offset?: number;
  limit?: number;
}): Promise<GalleryMainPageResult> {
  const { userId, ownerSlug, viewerId = null } = params;
  const offset = Math.max(0, params.offset ?? 0);
  const limit = Math.min(
    48,
    Math.max(1, params.limit ?? GALLERY_SCROLL_PAGE_SIZE),
  );

  const stubs = sortGalleryByPriority(
    filterGalleryStubsForViewer(
      await withVerifiedGalleryVariants(await getGalleryStubsCached(userId)),
      viewerId,
      userId,
    ),
  );
  const filterCounts = computeFilterCounts(stubs);
  const slice = stubs.slice(offset, offset + limit);

  const admin = createServiceRoleClient();
  const ownerIds = [...new Set(slice.map((x) => x.postOwnerId))];
  const tacPhamIds = [
    ...new Set(
      slice
        .filter((s) => s.tacPhamSlug && s.tacPhamId)
        .map((s) => s.tacPhamId),
    ),
  ];
  const orgPostIds = [
    ...new Set(
      slice
        .filter((s) => Boolean(s.orgHref && !s.tacPhamSlug) && s.tacPhamId)
        .map((s) => s.tacPhamId),
    ),
  ];
  const [ownerProfileById, creditsByTacPham, creditsByOrgPost] =
    await Promise.all([
      resolveOwnerProfiles(admin, ownerIds),
      loadCoAuthorCredits(admin, tacPhamIds),
      loadOrgBaiDangCoAuthorCredits(orgPostIds),
    ]);
  const ownerSlugById = new Map(
    [...ownerProfileById].map(([id, profile]) => [id, profile.slug]),
  );
  const items = await attachPersonalFiltersToGalleryItems(
    hydrateMainItems(
      slice,
      ownerSlug,
      userId,
      ownerSlugById,
      ownerProfileById,
      creditsByTacPham,
      creditsByOrgPost,
    ),
    userId,
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
  viewerId?: string | null;
}): Promise<{
  pinned: GalleryPinnedBanner[];
  items: GalleryGridItem[];
  totalTacPham: number;
}> {
  const { userId, ownerSlug, viewerId = null } = params;
  const stubs = filterGalleryStubsForViewer(
    await getGalleryStubsCached(userId),
    viewerId,
    userId,
  );
  if (stubs.length === 0) {
    return { pinned: [], items: [], totalTacPham: 0 };
  }

  const admin = createServiceRoleClient();
  const tacPhamIds = [
    ...new Set(
      stubs
        .filter((s) => s.tacPhamSlug && s.visibility === "feature")
        .map((s) => s.tacPhamId),
    ),
  ];
  const orgPostIds = [
    ...new Set(
      stubs
        .filter(
          (s) =>
            s.visibility === "feature" &&
            Boolean(s.orgHref && !s.tacPhamSlug),
        )
        .map((s) => s.tacPhamId),
    ),
  ];
  const [ownerProfileById, noiBatOrder, creditsByTacPham, creditsByOrgPost] =
    await Promise.all([
      resolveOwnerProfiles(
        admin,
        [...new Set(stubs.map((x) => x.postOwnerId))],
      ),
      fetchGalleryNoiBatOrderMap(userId),
      loadCoAuthorCredits(admin, tacPhamIds),
      loadOrgBaiDangCoAuthorCredits(orgPostIds),
    ]);
  const ownerSlugById = new Map(
    [...ownerProfileById].map(([id, profile]) => [id, profile.slug]),
  );
  return hydrateAsideItems(
    stubs,
    ownerSlug,
    userId,
    ownerSlugById,
    ownerProfileById,
    noiBatOrder,
    creditsByTacPham,
    creditsByOrgPost,
  );
}
