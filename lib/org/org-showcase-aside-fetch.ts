import "server-only";

import type { GalleryPinnedBanner } from "@/components/journey/JourneyGalleryAside";
import { listApprovedOrgDoanProjects } from "@/lib/journey/org-milestone-tag";
import type { OrgDoanProjectItem } from "@/lib/journey/org-milestone-tag-types";
import { journeyImageFields } from "@/lib/journey/images";
import { resolvePostGridEntry } from "@/lib/journey/post-content-kind";
import { galleryItemLabel } from "@/lib/journey/post-media";
import type { OrgShowcaseAsideKind } from "@/lib/org/org-showcase-aside-types";
import { AVATAR_VARIANT_PX } from "@/lib/cloudflare/cf-image-variants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { STUDIO_SHOWCASE_LOAI } from "@/lib/to-chuc/studio-page-config";
import { studioTabPath } from "@/lib/to-chuc/studio-routes";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import { sortDoanProjectsForPublic } from "@/lib/truong/doan-project-sort";
import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { truongTabPath } from "@/lib/truong/truong-routes";

export type { OrgShowcaseAsideKind } from "@/lib/org/org-showcase-aside-types";

const ASIDE_LIMIT = 12;

/** Popover thumb nhỏ — ép CF named variant `avatar` (256px), bỏ grid/flexible. */
function showcaseAvatarSrc(src: string): string {
  const trimmed = src.trim();
  const match =
    /^https:\/\/imagedelivery\.net\/([^/]+)\/([^/]+)\/.+$/i.exec(trimmed);
  if (!match) return trimmed;
  return `https://imagedelivery.net/${match[1]}/${match[2]}/avatar`;
}

type BaiDangRow = {
  id: string;
  tieu_de: string;
  tom_tat: string | null;
  cover_id: string | null;
  noi_dung_blocks: unknown;
  loai_bai_dang: string | null;
};

function orgHref(kind: OrgShowcaseAsideKind, slug: string): string {
  if (kind === "co_so_dao_tao") return coSoTabPath(slug, "san-pham");
  if (kind === "truong") return truongTabPath(slug, "do-an-sinh-vien");
  return studioTabPath(slug, "showcase");
}

function loaiFilter(kind: OrgShowcaseAsideKind): string[] {
  if (kind === "studio") return ["studio", "doanh_nghiep"];
  if (kind === "truong") return ["truong_dai_hoc"];
  return ["co_so_dao_tao"];
}

function imageFromCover(
  coverId: string | null,
  coverSrc: string | null,
): { src: string; width?: number; height?: number } | null {
  if (coverSrc) {
    const src = showcaseAvatarSrc(coverSrc);
    const isCfAvatar = src.endsWith("/avatar");
    return {
      src,
      width: isCfAvatar ? AVATAR_VARIANT_PX : 560,
      height: isCfAvatar ? AVATAR_VARIANT_PX : 315,
    };
  }
  if (!coverId) return null;
  const img = journeyImageFields(coverId, "gallery-grid");
  if (!img?.src) return null;
  return {
    src: showcaseAvatarSrc(img.src),
    width: AVATAR_VARIANT_PX,
    height: AVATAR_VARIANT_PX,
  };
}

function rowToPinned(
  row: BaiDangRow,
  href: string,
  pinLabel: string,
): GalleryPinnedBanner | null {
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

  return {
    id: `org-showcase-${row.id}`,
    src: img?.src ?? "",
    width: img?.width,
    height: img?.height,
    pin: pinLabel,
    title: galleryItemLabel(row.tieu_de, grid.mediaKind),
    meta: row.tom_tat?.trim() || pinLabel,
    href,
    mediaKind: grid.mediaKind,
    embedProvider: grid.embedProvider ?? null,
    isVideo,
    videoProcessing: grid.videoProcessing,
    videoPreviewSrc: grid.videoPreviewSrc,
  };
}

function doanProjectToPinned(
  item: OrgDoanProjectItem,
): GalleryPinnedBanner | null {
  const rawCover = item.coverSrc?.trim() || "";
  const coverSrc = rawCover ? showcaseAvatarSrc(rawCover) : "";
  const isVideo = Boolean(item.isVideo);
  if (!coverSrc && !isVideo && !item.videoPreviewSrc?.trim()) return null;

  const metaParts = [item.studentName, item.khoaHocTen].filter(Boolean);
  const isCfAvatar = coverSrc.endsWith("/avatar");

  return {
    id: `org-doan-${item.id}`,
    src: coverSrc,
    width: coverSrc
      ? isCfAvatar
        ? AVATAR_VARIANT_PX
        : 560
      : undefined,
    height: coverSrc
      ? isCfAvatar
        ? AVATAR_VARIANT_PX
        : 315
      : undefined,
    pin: "Học viên",
    title: item.projectTitle,
    meta: metaParts.join(" · ") || "Sản phẩm học viên",
    authorName: item.studentName,
    authorAvatarUrl: item.studentAvatarUrl,
    href: item.href,
    cotMocId: item.cotMocId,
    mediaKind: isVideo ? "video" : "photo",
    isVideo,
    videoPreviewSrc: item.videoPreviewSrc ?? null,
  };
}

/** Trường + cơ sở: bài học viên / đồ án đã bật hiện (`featured=1`), sort điểm. */
async function fetchDoanHocVienShowcase(
  orgId: string,
): Promise<{ pinned: GalleryPinnedBanner[] }> {
  const projects = await listApprovedOrgDoanProjects(orgId, {
    featuredOnly: true,
  });
  const sorted = sortDoanProjectsForPublic(projects);
  const pinned: GalleryPinnedBanner[] = [];
  for (const project of sorted) {
    const item = doanProjectToPinned(project);
    if (!item) continue;
    pinned.push(item);
    if (pinned.length >= ASIDE_LIMIT) break;
  }
  return { pinned };
}

/**
 * Preview showcase org — dùng trong JourneyOrgPopover
 * (cùng pattern gallery-aside của user).
 * Studio: `org_bai_dang` loai showcase.
 * Trường / cơ sở: đồ án học viên đã bật hiện (cùng nguồn tab Đồ án / SP học viên).
 */
export async function fetchOrgShowcaseAside(params: {
  slug: string;
  kind: OrgShowcaseAsideKind;
}): Promise<{ pinned: GalleryPinnedBanner[] }> {
  const slug = params.slug.trim();
  if (!slug) return { pinned: [] };

  const admin = createServiceRoleClient();
  const { data: org } = await admin
    .from("org_to_chuc")
    .select("id, slug, loai_to_chuc")
    .eq("slug", slug)
    .in("loai_to_chuc", loaiFilter(params.kind))
    .maybeSingle<{ id: string; slug: string; loai_to_chuc: string }>();

  if (!org) return { pinned: [] };

  if (params.kind === "co_so_dao_tao" || params.kind === "truong") {
    return fetchDoanHocVienShowcase(org.id);
  }

  const pinLabel = "Showcase";
  const query = admin
    .from("org_bai_dang")
    .select("id, tieu_de, tom_tat, cover_id, noi_dung_blocks, loai_bai_dang")
    .eq("id_to_chuc", org.id)
    .eq("trang_thai", "da_dang")
    .eq("loai_bai_dang", STUDIO_SHOWCASE_LOAI)
    .order("tao_luc", { ascending: false })
    .limit(ASIDE_LIMIT * 2);

  const { data } = await query.returns<BaiDangRow[]>();
  const href = orgHref(params.kind, org.slug);
  const pinned: GalleryPinnedBanner[] = [];

  for (const row of data ?? []) {
    const item = rowToPinned(row, href, pinLabel);
    if (!item) continue;
    pinned.push(item);
    if (pinned.length >= ASIDE_LIMIT) break;
  }

  return { pinned };
}
