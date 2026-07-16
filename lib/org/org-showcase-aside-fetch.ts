import "server-only";

import type { GalleryPinnedBanner } from "@/components/journey/JourneyGalleryAside";
import { journeyImageFields } from "@/lib/journey/images";
import { resolvePostGridEntry } from "@/lib/journey/post-content-kind";
import { galleryItemLabel } from "@/lib/journey/post-media";
import type { OrgShowcaseAsideKind } from "@/lib/org/org-showcase-aside-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { STUDIO_SHOWCASE_LOAI } from "@/lib/to-chuc/studio-page-config";
import { studioTabPath } from "@/lib/to-chuc/studio-routes";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import { CO_SO_DEFAULT_TAB, coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import {
  TRUONG_DEFAULT_TAB,
  truongTabPath,
} from "@/lib/truong/truong-routes";

export type { OrgShowcaseAsideKind } from "@/lib/org/org-showcase-aside-types";

const ASIDE_LIMIT = 12;

type BaiDangRow = {
  id: string;
  tieu_de: string;
  tom_tat: string | null;
  cover_id: string | null;
  noi_dung_blocks: unknown;
  loai_bai_dang: string | null;
};

function orgHref(kind: OrgShowcaseAsideKind, slug: string): string {
  if (kind === "co_so_dao_tao") return coSoTabPath(slug, CO_SO_DEFAULT_TAB);
  if (kind === "truong") return truongTabPath(slug, TRUONG_DEFAULT_TAB);
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
): { src: string; srcSet?: string; width?: number; height?: number } | null {
  if (coverSrc) return { src: coverSrc, width: 560, height: 315 };
  if (!coverId) return null;
  const img = journeyImageFields(coverId, "gallery-pinned");
  if (!img?.src) return null;
  return img;
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
    srcSet: img?.srcSet,
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

/**
 * Preview showcase / bài có media của org — dùng trong JourneyOrgPopover
 * (cùng pattern gallery-aside của user).
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

  const pinLabel = params.kind === "studio" ? "Showcase" : "Nổi bật";
  let query = admin
    .from("org_bai_dang")
    .select("id, tieu_de, tom_tat, cover_id, noi_dung_blocks, loai_bai_dang")
    .eq("id_to_chuc", org.id)
    .eq("trang_thai", "da_dang")
    .order("tao_luc", { ascending: false })
    .limit(ASIDE_LIMIT * 2);

  if (params.kind === "studio") {
    query = query.eq("loai_bai_dang", STUDIO_SHOWCASE_LOAI);
  }

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
