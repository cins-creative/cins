import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";
import { loadCoAuthorCredits } from "@/lib/journey/coauthor-credits";
import { resolveGallerySourceAuthor } from "@/lib/journey/gallery-source-author";
import type { GalleryStub } from "@/lib/journey/gallery-stubs";
import { journeyImageFields } from "@/lib/journey/images";
import { resolvePostGridEntry } from "@/lib/journey/post-content-kind";
import {
  galleryItemExcerptLine,
  galleryItemLabel,
  type GalleryMediaKind,
} from "@/lib/journey/post-media";
import { getAvatarUrl } from "@/lib/journey/profile";
import { listFriends } from "@/lib/social/ket-ban";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { listActiveCongDongOrgIds } from "@/lib/cins/worldJourneyCongDongFeed";
import { listFollowingOrgIds } from "@/lib/cins/worldJourneyOrgFeed";
import { STUDIO_SHOWCASE_LOAI } from "@/lib/to-chuc/studio-page-config";
import { orgPublicHref } from "@/lib/search/helpers";
import { studioTabPath } from "@/lib/to-chuc/studio-routes";
import { CHE_DO_MOC_CONG_DONG } from "@/lib/journey/journey-visible-clause";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import { loadOrgBaiDangCoAuthorCredits } from "@/lib/truong/org-bai-dang-coauthor";
import type { Block } from "@/lib/editor/types";
import {
  WORLD_JOURNEY_FEED_RANK_REVALIDATE_SEC,
  WORLD_JOURNEY_GALLERY_PAGE_SIZE,
} from "@/lib/cins/worldJourneyFeedConstants";
import {
  resolveWorldJourneyFeedFilterChip,
  worldJourneyGalleryItemMatchesFilter,
} from "@/lib/cins/worldJourneyFeedFilters";
import {
  matchesFeedSource,
  normalizeFeedSource,
  type FeedSourceFilter,
} from "@/lib/cins/worldJourneyFeedSource";
import { withWorldBoostGalleryItems } from "@/lib/cins/world-boost";

/** Pool mặc định gallery WJ. */
const POOL_LIMIT = 120;
/** Pool rộng khi đang lọc media/nhúng/nguồn — nhiều ô lưới hơn timeline. */
const FILTER_POOL_LIMIT = 360;

type FeatureRow = {
  id_cot_moc: string;
  content_cot_moc: {
    id: string;
    thoi_diem: string;
    loai_moc: string;
    che_do_hien_thi: string;
    mo_ta: string | null;
    tao_luc: string | null;
    id_nguoi_dung: string;
    id_to_chuc?: string | null;
  } | null;
  content_tac_pham: {
    id: string;
    slug: string | null;
    tieu_de: string;
    mo_ta: string | null;
    cover_id: string | null;
    id_nguoi_dung: string;
    noi_dung_blocks: unknown;
  } | null;
};

type ShowcaseRow = {
  id: string;
  tieu_de: string;
  tom_tat: string | null;
  cover_id: string | null;
  noi_dung_blocks: unknown;
  tao_luc: string;
  id_to_chuc: string;
  org_to_chuc:
    | {
        slug: string | null;
        ten: string | null;
        loai_to_chuc: string | null;
        avatar_id: string | null;
        logo_id: string | null;
      }
    | Array<{
        slug: string | null;
        ten: string | null;
        loai_to_chuc: string | null;
        avatar_id: string | null;
        logo_id: string | null;
      }>
    | null;
};

type AuthorRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

type RankedGalleryItem = GalleryMainItem & {
  sortAt: string;
  /** Internal — owner id cho resolve stack đóng góp (bỏ trước khi trả client). */
  postOwnerId?: string;
};

function pickOrg<T>(org: T | T[] | null | undefined): T | null {
  if (!org) return null;
  return Array.isArray(org) ? (org[0] ?? null) : org;
}

function parseBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  return raw as Block[];
}

async function listFollowingUserIds(viewerId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_theo_doi")
    .select("id_doi_tuong")
    .eq("id_nguoi_theo_doi", viewerId)
    .eq("loai_doi_tuong", "nguoi_dung")
    .returns<Array<{ id_doi_tuong: string }>>();
  return (data ?? []).map((r) => r.id_doi_tuong);
}

async function loadAuthors(ids: string[]): Promise<Map<string, AuthorRow>> {
  const map = new Map<string, AuthorRow>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", unique)
    .returns<AuthorRow[]>();
  for (const row of data ?? []) map.set(row.id, row);
  return map;
}

function imageFromCover(
  coverId: string | null,
  coverSrc: string | null,
): { src: string; srcSet?: string; width?: number; height?: number } | null {
  if (coverSrc) return { src: coverSrc, width: 640, height: 360 };
  if (!coverId) return null;
  const img = journeyImageFields(coverId, "gallery-grid");
  if (!img?.src) return null;
  return img;
}

function featureRowToItem(
  row: FeatureRow,
  authors: Map<string, AuthorRow>,
  opts?: {
    communityHref?: string | null;
    communityName?: string | null;
    feedSource?: "user" | "cong_dong";
    feedFollowing?: boolean;
  },
): RankedGalleryItem | null {
  const cm = row.content_cot_moc;
  const tp = row.content_tac_pham;
  if (!cm || !tp) return null;

  const blocks = parseBlocks(tp.noi_dung_blocks);
  const grid = resolvePostGridEntry({
    moTa: tp.mo_ta ?? cm.mo_ta,
    coverId: tp.cover_id,
    blocks,
  });
  if (!grid) return null;
  if (
    !grid.coverId &&
    !grid.coverSrc &&
    grid.mediaKind !== "video" &&
    grid.mediaKind !== "embed"
  ) {
    return null;
  }

  const img = imageFromCover(grid.coverId, grid.coverSrc);
  const isVideo = grid.mediaKind === "video";
  if (!img?.src && !isVideo && grid.mediaKind !== "embed") return null;

  const author = authors.get(tp.id_nguoi_dung);
  const slug = author?.slug;
  if (!slug && !opts?.communityHref) return null;

  const href = opts?.communityHref
    ? opts.communityHref
    : tp.slug
      ? `/${slug}/p/${tp.slug}`
      : `/${slug}`;

  const sortAt = cm.tao_luc ?? cm.thoi_diem;
  return {
    id: `feat-${cm.id}`,
    cotMocId: cm.id,
    src: img?.src ?? "",
    srcSet: img?.srcSet,
    width: img?.width,
    height: img?.height,
    label: galleryItemLabel(tp.tieu_de, grid.mediaKind),
    href,
    meta:
      opts?.communityName
        ? `Cộng đồng · ${opts.communityName}`
        : galleryItemExcerptLine(cm.mo_ta, tp.mo_ta, blocks),
    featured: cm.che_do_hien_thi === "feature",
    type:
      cm.loai_moc === "hoc"
        ? "hoc"
        : cm.loai_moc === "lam_viec"
          ? "lam"
          : cm.loai_moc === "su_kien"
            ? "su-kien"
            : cm.loai_moc === "thanh_tuu"
              ? "thanh-tuu"
              : cm.loai_moc === "ca_nhan"
                ? "ca-nhan"
                : "du-an",
    visibility: cm.che_do_hien_thi === "feature" ? "feature" : "public",
    postSlug: tp.slug,
    postOwnerSlug: slug ?? null,
    tacPhamId: tp.id,
    postOwnerId: tp.id_nguoi_dung,
    variant: "self",
    mediaKind: grid.mediaKind,
    embedProvider: grid.embedProvider ?? null,
    isVideo,
    videoProcessing: grid.videoProcessing,
    videoPreviewSrc: grid.videoPreviewSrc,
    authorName: author?.ten_hien_thi?.trim() || author?.slug || null,
    authorAvatarUrl: getAvatarUrl(author?.avatar_id ?? null),
    orgKicker: opts?.communityName ? "Cộng đồng" : "Nổi bật",
    feedSource: opts?.feedSource ?? "user",
    feedFollowing: opts?.feedFollowing ?? false,
    sortAt,
  };
}

function showcaseRowToItem(
  row: ShowcaseRow,
  opts?: { feedFollowing?: boolean },
): RankedGalleryItem | null {
  const org = pickOrg(row.org_to_chuc);
  if (!org?.slug?.trim() || org.loai_to_chuc !== "studio") return null;

  const blocks = parseBaiDangBlocks(row.noi_dung_blocks) ?? [];
  const grid = resolvePostGridEntry({
    moTa: row.tom_tat,
    coverId: row.cover_id,
    blocks,
  });
  if (!grid) return null;
  if (
    !grid.coverId &&
    !grid.coverSrc &&
    grid.mediaKind !== "video" &&
    grid.mediaKind !== "embed"
  ) {
    return null;
  }

  const img = imageFromCover(grid.coverId, grid.coverSrc);
  const isVideo = grid.mediaKind === "video";
  if (!img?.src && !isVideo && grid.mediaKind !== "embed") return null;

  const orgName = org.ten?.trim() || org.slug.trim();
  const avatarId = org.avatar_id ?? org.logo_id;

  return {
    id: `showcase-${row.id}`,
    cotMocId: row.id,
    src: img?.src ?? "",
    srcSet: img?.srcSet,
    width: img?.width,
    height: img?.height,
    label: galleryItemLabel(row.tieu_de, grid.mediaKind),
    href: studioTabPath(org.slug.trim(), "showcase"),
    meta: row.tom_tat?.trim() || `Showcase · ${orgName}`,
    featured: true,
    type: "du-an",
    variant: "tagged",
    tacPhamId: row.id,
    mediaKind: grid.mediaKind,
    embedProvider: grid.embedProvider ?? null,
    isVideo,
    videoProcessing: grid.videoProcessing,
    videoPreviewSrc: grid.videoPreviewSrc,
    authorName: orgName,
    authorAvatarUrl: getAvatarUrl(avatarId),
    orgAvatarUrl: getAvatarUrl(avatarId),
    orgKicker: "Showcase studio",
    feedSource: "org",
    feedFollowing: opts?.feedFollowing ?? false,
    sortAt: row.tao_luc,
  };
}

/** Nhãn tổ chức trên gallery card (`orgKicker`). */
function orgLoaiKicker(loai: string | null): string {
  if (loai === "co_so_dao_tao") return "Cơ sở đào tạo";
  if (loai === "cong_dong") return "Cộng đồng";
  if (loai === "studio") return "Studio";
  return "Trường đại học";
}

/** Link công khai của org theo loại — đồng bộ feed dòng thời gian. */
function orgHref(slug: string, loai: string | null): string {
  if (loai === "studio") return studioTabPath(slug, "showcase");
  return orgPublicHref(loai ?? "truong_dai_hoc", slug);
}

/** Bài đăng org (trường / cơ sở) có media → card gallery, link sang trang org. */
function orgBaiDangRowToItem(
  row: ShowcaseRow,
  opts?: { feedFollowing?: boolean },
): RankedGalleryItem | null {
  const org = pickOrg(row.org_to_chuc);
  if (!org?.slug?.trim()) return null;

  const blocks = parseBaiDangBlocks(row.noi_dung_blocks) ?? [];
  const grid = resolvePostGridEntry({
    moTa: row.tom_tat,
    coverId: row.cover_id,
    blocks,
  });
  if (!grid) return null;
  if (
    !grid.coverId &&
    !grid.coverSrc &&
    grid.mediaKind !== "video" &&
    grid.mediaKind !== "embed"
  ) {
    return null;
  }

  const img = imageFromCover(grid.coverId, grid.coverSrc);
  const isVideo = grid.mediaKind === "video";
  if (!img?.src && !isVideo && grid.mediaKind !== "embed") return null;

  const orgSlug = org.slug.trim();
  const orgName = org.ten?.trim() || orgSlug;
  const avatarId = org.avatar_id ?? org.logo_id;

  return {
    id: `org-post-${row.id}`,
    cotMocId: row.id,
    src: img?.src ?? "",
    srcSet: img?.srcSet,
    width: img?.width,
    height: img?.height,
    label: galleryItemLabel(row.tieu_de, grid.mediaKind),
    href: orgHref(orgSlug, org.loai_to_chuc),
    meta: row.tom_tat?.trim() || `${orgLoaiKicker(org.loai_to_chuc)} · ${orgName}`,
    featured: false,
    type: "du-an",
    variant: "tagged",
    tacPhamId: row.id,
    mediaKind: grid.mediaKind,
    embedProvider: grid.embedProvider ?? null,
    isVideo,
    videoProcessing: grid.videoProcessing,
    videoPreviewSrc: grid.videoPreviewSrc,
    authorName: orgName,
    authorAvatarUrl: getAvatarUrl(avatarId),
    orgAvatarUrl: getAvatarUrl(avatarId),
    orgKicker: orgLoaiKicker(org.loai_to_chuc),
    feedSource: "org",
    feedFollowing: opts?.feedFollowing ?? false,
    sortAt: row.tao_luc,
  };
}

async function fetchFeatureRows(limit: number): Promise<FeatureRow[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, content_cot_moc:content_cot_moc!inner(id, thoi_diem, loai_moc, che_do_hien_thi, mo_ta, tao_luc, id_nguoi_dung, id_to_chuc), content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, mo_ta, cover_id, id_nguoi_dung, noi_dung_blocks)",
    )
    .eq("content_cot_moc.che_do_hien_thi", "feature")
    .order("thu_tu", { ascending: true })
    .limit(limit)
    .returns<FeatureRow[]>();
  return data ?? [];
}

async function fetchCongDongVisualRows(
  orgIds: string[],
  limit: number,
): Promise<FeatureRow[]> {
  if (orgIds.length === 0) return [];
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, content_cot_moc:content_cot_moc!inner(id, thoi_diem, loai_moc, che_do_hien_thi, mo_ta, tao_luc, id_nguoi_dung, id_to_chuc), content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, mo_ta, cover_id, id_nguoi_dung, noi_dung_blocks)",
    )
    .eq("content_cot_moc.che_do_hien_thi", CHE_DO_MOC_CONG_DONG)
    .in("content_cot_moc.id_to_chuc", orgIds)
    .order("thu_tu", { ascending: true })
    .limit(limit)
    .returns<FeatureRow[]>();
  return data ?? [];
}

async function fetchStudioShowcaseRows(limit: number): Promise<ShowcaseRow[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_bai_dang")
    .select(
      "id, tieu_de, tom_tat, cover_id, noi_dung_blocks, tao_luc, id_to_chuc, org_to_chuc!inner(slug, ten, loai_to_chuc, avatar_id, logo_id)",
    )
    .eq("trang_thai", "da_dang")
    .eq("loai_bai_dang", STUDIO_SHOWCASE_LOAI)
    .eq("org_to_chuc.loai_to_chuc", "studio")
    .order("tao_luc", { ascending: false })
    .limit(limit)
    .returns<ShowcaseRow[]>();
  return data ?? [];
}

/** Bài đăng trường / cơ sở (`org_bai_dang` da_dang) có media — khác showcase studio. */
async function fetchOrgBaiDangVisualRows(limit: number): Promise<ShowcaseRow[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_bai_dang")
    .select(
      "id, tieu_de, tom_tat, cover_id, noi_dung_blocks, tao_luc, id_to_chuc, org_to_chuc!inner(slug, ten, loai_to_chuc, avatar_id, logo_id)",
    )
    .eq("trang_thai", "da_dang")
    .in("org_to_chuc.loai_to_chuc", ["truong_dai_hoc", "co_so_dao_tao"])
    .order("tao_luc", { ascending: false })
    .limit(limit)
    .returns<ShowcaseRow[]>();
  return data ?? [];
}

async function loadCongDongOrgMeta(
  orgIds: string[],
): Promise<Map<string, { name: string; href: string }>> {
  const map = new Map<string, { name: string; href: string }>();
  const unique = [...new Set(orgIds.filter(Boolean))];
  if (unique.length === 0) return map;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, ten, slug")
    .in("id", unique)
    .eq("loai_to_chuc", "cong_dong")
    .returns<Array<{ id: string; ten: string; slug: string }>>();
  for (const row of data ?? []) {
    map.set(row.id, {
      name: row.ten,
      href: `/cong-dong/${row.slug}`,
    });
  }
  return map;
}

function wjStubForSourceAuthor(item: RankedGalleryItem): GalleryStub | null {
  if (!item.tacPhamId) return null;
  const isOrg = item.feedSource === "org";
  const mediaKind: GalleryMediaKind = item.mediaKind ?? "photo";
  return {
    tacPhamId: item.tacPhamId,
    cotMocId: item.cotMocId,
    thoiDiem: item.sortAt,
    taoLuc: item.sortAt,
    visibility: item.visibility ?? "public",
    tacPhamSlug: isOrg ? null : (item.postSlug ?? "x"),
    tieuDe: item.label,
    excerpt: item.meta,
    coverId: null,
    coverSrc: null,
    videoPreviewSrc: null,
    videoProcessing: Boolean(item.videoProcessing),
    postOwnerId: item.postOwnerId ?? "",
    type: item.type,
    variant: item.variant,
    mediaKind,
    embedProvider: item.embedProvider ?? null,
    orgHref: isOrg ? (item.href ?? "/") : null,
    orgAvatarUrl: item.orgAvatarUrl ?? null,
    orgKicker: item.orgKicker ?? null,
  };
}

async function attachSourceAuthorsToWjItems(
  items: RankedGalleryItem[],
  authors: Map<string, AuthorRow>,
): Promise<RankedGalleryItem[]> {
  if (items.length === 0) return items;

  const admin = createServiceRoleClient();
  const tacPhamIds = [
    ...new Set(
      items
        .filter(
          (i) =>
            i.tacPhamId &&
            (i.feedSource === "user" || i.feedSource === "cong_dong"),
        )
        .map((i) => i.tacPhamId as string),
    ),
  ];
  const orgPostIds = [
    ...new Set(
      items
        .filter((i) => i.tacPhamId && i.feedSource === "org")
        .map((i) => i.tacPhamId as string),
    ),
  ];

  const [creditsByTacPham, creditsByOrgPost] = await Promise.all([
    loadCoAuthorCredits(admin, tacPhamIds),
    loadOrgBaiDangCoAuthorCredits(orgPostIds),
  ]);

  return items.map((item) => {
    const stub = wjStubForSourceAuthor(item);
    if (!stub) return item;

    const isOrg = item.feedSource === "org";
    const credits = isOrg
      ? (creditsByOrgPost.get(item.tacPhamId!) ?? [])
      : (creditsByTacPham.get(item.tacPhamId!) ?? []);

    const author = item.postOwnerId
      ? authors.get(item.postOwnerId)
      : undefined;
    const ownerProfile = author
      ? {
          slug: author.slug,
          name: author.ten_hien_thi?.trim() || author.slug,
          avatarUrl: getAvatarUrl(author.avatar_id),
        }
      : item.authorName
        ? {
            slug: item.postOwnerSlug ?? "",
            name: item.authorName,
            avatarUrl: item.authorAvatarUrl ?? null,
          }
        : undefined;

    /* journeyOwnerId = post owner → bài có cộng sự vẫn hiện stack trên WJ. */
    const journeyOwnerId = item.postOwnerId || stub.postOwnerId || "";
    const sourceAuthor = resolveGallerySourceAuthor(
      stub,
      journeyOwnerId,
      ownerProfile,
      credits,
    );

    if (!sourceAuthor.showCorner) {
      /* Bài org đơn tác giả: ẩn avatar/tên overlay (trước đây luôn hiện logo tổ chức). */
      if (isOrg) {
        return {
          ...item,
          showSourceAuthor: false,
          sourcePeople: undefined,
          authorName: null,
          authorAvatarUrl: null,
        };
      }
      return item;
    }

    return {
      ...item,
      showSourceAuthor: true,
      sourcePeople: sourceAuthor.people,
      authorName: sourceAuthor.name ?? item.authorName,
      authorAvatarUrl: sourceAuthor.avatarUrl ?? item.authorAvatarUrl,
    };
  });
}

/**
 * Gallery trang chủ: dự án Nổi bật (user) + bài cộng đồng có media
 * + showcase studio — sắp theo thời gian đăng.
 */
async function buildWorldJourneyGalleryPool(
  viewerId: string,
  poolLimit = POOL_LIMIT,
): Promise<RankedGalleryItem[]> {
  const [friendIds, followingIds, followingOrgIds, memberCongDongIds] =
    await Promise.all([
      listFriends(viewerId),
      listFollowingUserIds(viewerId),
      listFollowingOrgIds(viewerId),
      listActiveCongDongOrgIds(viewerId),
    ]);

  const knownAuthors = new Set<string>([
    viewerId,
    ...friendIds,
    ...followingIds,
  ]);
  const congDongOrgIds = [...new Set([...memberCongDongIds, ...followingOrgIds])];

  const [featureRows, congDongRows, showcaseRows, orgBaiDangRows] =
    await Promise.all([
      fetchFeatureRows(poolLimit),
      fetchCongDongVisualRows(congDongOrgIds, Math.min(60, poolLimit)),
      fetchStudioShowcaseRows(Math.min(60, poolLimit)),
      fetchOrgBaiDangVisualRows(Math.min(60, poolLimit)),
    ]);

  /* Ưu tiên feature từ mạng quan hệ; vẫn giữ feature toàn cục (discovery). */
  const featurePrefer = featureRows.filter((r) => {
    const owner = r.content_cot_moc?.id_nguoi_dung;
    return owner ? knownAuthors.has(owner) : false;
  });
  const featureRest = featureRows.filter((r) => {
    const owner = r.content_cot_moc?.id_nguoi_dung;
    return owner ? !knownAuthors.has(owner) : false;
  });
  const orderedFeature = [...featurePrefer, ...featureRest];

  const authorIds = [
    ...orderedFeature,
    ...congDongRows,
  ]
    .map((r) => r.content_tac_pham?.id_nguoi_dung)
    .filter((id): id is string => Boolean(id));

  const congDongOrgMetaIds = congDongRows
    .map((r) => r.content_cot_moc?.id_to_chuc)
    .filter((id): id is string => Boolean(id));

  const [authors, congDongMeta] = await Promise.all([
    loadAuthors(authorIds),
    loadCongDongOrgMeta(congDongOrgMetaIds),
  ]);

  const items: RankedGalleryItem[] = [];
  const seen = new Set<string>();

  for (const row of orderedFeature) {
    const owner = row.content_cot_moc?.id_nguoi_dung;
    const item = featureRowToItem(row, authors, {
      feedSource: "user",
      feedFollowing: owner ? knownAuthors.has(owner) : false,
    });
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }

  for (const row of congDongRows) {
    const orgId = row.content_cot_moc?.id_to_chuc;
    const meta = orgId ? congDongMeta.get(orgId) : null;
    /* Pool cộng đồng chỉ lấy org mình là thành viên / đang theo dõi → luôn "theo dõi". */
    const item = featureRowToItem(row, authors, {
      communityHref: meta?.href,
      communityName: meta?.name,
      feedSource: "cong_dong",
      feedFollowing: true,
    });
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }

  const followedOrgSet = new Set(followingOrgIds);
  const showcasePrefer = showcaseRows.filter((r) =>
    followedOrgSet.has(r.id_to_chuc),
  );
  const showcaseRest = showcaseRows.filter(
    (r) => !followedOrgSet.has(r.id_to_chuc),
  );
  for (const row of [...showcasePrefer, ...showcaseRest]) {
    const item = showcaseRowToItem(row, {
      feedFollowing: followedOrgSet.has(row.id_to_chuc),
    });
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }

  /* Bài trường/cơ sở: ưu tiên org đang theo dõi, vẫn giữ khám phá (như dòng thời gian). */
  const orgPostPrefer = orgBaiDangRows.filter((r) =>
    followedOrgSet.has(r.id_to_chuc),
  );
  const orgPostRest = orgBaiDangRows.filter(
    (r) => !followedOrgSet.has(r.id_to_chuc),
  );
  for (const row of [...orgPostPrefer, ...orgPostRest]) {
    const item = orgBaiDangRowToItem(row, {
      feedFollowing: followedOrgSet.has(row.id_to_chuc),
    });
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }

  const ranked = items
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.sortAt > b.sortAt ? -1 : a.sortAt < b.sortAt ? 1 : 0;
    })
    .slice(0, poolLimit);

  return attachSourceAuthorsToWjItems(ranked, authors);
}

export type WorldJourneyGalleryPage = {
  items: GalleryMainItem[];
  hasMore: boolean;
  nextOffset: number;
  totalCount: number;
};

export type WorldJourneyGalleryPageOptions = {
  filter?: string | null;
  source?: FeedSourceFilter | string | null;
};

function galleryPageNeedsWidePool(opts: WorldJourneyGalleryPageOptions): boolean {
  const filter = opts.filter?.trim();
  if (filter && filter !== "all") return true;
  return normalizeFeedSource(opts.source) !== "all";
}

function applyWorldJourneyGalleryPageFilters(
  items: ReadonlyArray<RankedGalleryItem>,
  opts: WorldJourneyGalleryPageOptions,
): RankedGalleryItem[] {
  const chip = resolveWorldJourneyFeedFilterChip(opts.filter);
  const source = normalizeFeedSource(opts.source);
  return items.filter(
    (item) =>
      matchesFeedSource(item, source) &&
      worldJourneyGalleryItemMatchesFilter(item, chip),
  );
}

function sliceGalleryPage(
  ranked: RankedGalleryItem[],
  offset: number,
  limit: number,
): WorldJourneyGalleryPage {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.min(
    Math.max(1, limit),
    WORLD_JOURNEY_GALLERY_PAGE_SIZE * 3,
  );
  const page = ranked.slice(safeOffset, safeOffset + safeLimit);
  const nextOffset = safeOffset + page.length;
  const items: GalleryMainItem[] = page.map(
    ({ sortAt: _s, postOwnerId: _owner, ...rest }) => rest,
  );
  return {
    items,
    hasMore: nextOffset < ranked.length,
    nextOffset,
    totalCount: ranked.length,
  };
}

const buildCached = cache((viewerId: string) =>
  buildWorldJourneyGalleryPool(viewerId, POOL_LIMIT),
);

const buildWideCached = cache((viewerId: string) =>
  buildWorldJourneyGalleryPool(viewerId, FILTER_POOL_LIMIT),
);

function buildForApi(viewerId: string) {
  return unstable_cache(
    () => buildWorldJourneyGalleryPool(viewerId, POOL_LIMIT),
    ["world-journey-gallery", viewerId],
    { revalidate: WORLD_JOURNEY_FEED_RANK_REVALIDATE_SEC },
  )();
}

function buildWideForApi(viewerId: string) {
  return unstable_cache(
    () => buildWorldJourneyGalleryPool(viewerId, FILTER_POOL_LIMIT),
    ["world-journey-gallery-wide", viewerId],
    { revalidate: WORLD_JOURNEY_FEED_RANK_REVALIDATE_SEC },
  )();
}

export async function fetchWorldJourneyGalleryPage(
  viewerId: string,
  offset = 0,
  limit = WORLD_JOURNEY_GALLERY_PAGE_SIZE,
  options: WorldJourneyGalleryPageOptions = {},
): Promise<WorldJourneyGalleryPage> {
  const ranked = galleryPageNeedsWidePool(options)
    ? await buildWideForApi(viewerId)
    : await buildForApi(viewerId);
  const filtered = applyWorldJourneyGalleryPageFilters(ranked, options);
  const boosted = await withWorldBoostGalleryItems(filtered);
  return sliceGalleryPage(boosted, offset, limit);
}

export async function fetchWorldJourneyGalleryPageCached(
  viewerId: string,
  offset = 0,
  limit = WORLD_JOURNEY_GALLERY_PAGE_SIZE,
  options: WorldJourneyGalleryPageOptions = {},
): Promise<WorldJourneyGalleryPage> {
  const ranked = galleryPageNeedsWidePool(options)
    ? await buildWideCached(viewerId)
    : await buildCached(viewerId);
  const filtered = applyWorldJourneyGalleryPageFilters(ranked, options);
  const boosted = await withWorldBoostGalleryItems(filtered);
  return sliceGalleryPage(boosted, offset, limit);
}
