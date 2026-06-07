import "server-only";

import { resolveFilterIdsBySlugs } from "@/lib/cong-dong/filters";
import { createCongDongPost } from "@/lib/cong-dong/posts";
import { deriveMoTaFallback } from "@/lib/editor/sanitize";
import type { Block } from "@/lib/editor/types";
import {
  detectMediaPostKind,
  extractPhotoImageIds,
  extractVideoUrl,
  isMediaFallbackTitle,
  milestoneCardCaptionPlain,
} from "@/lib/journey/post-media";

export async function syncCongDongPostFromPublish(params: {
  orgId: string;
  authorId: string;
  tacPhamId: string;
  filterSlugs: string[];
  tieuDe: string;
  moTa: string;
  coverSeed: string | null;
  blocks: Block[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const mediaKind = detectMediaPostKind(params.blocks);

  let noiDung =
    milestoneCardCaptionPlain(params.moTa, params.blocks)?.trim() ?? "";
  if (!noiDung) {
    noiDung = params.moTa.trim() || deriveMoTaFallback(params.blocks);
  }
  if (!noiDung && mediaKind === "video") {
    noiDung = extractVideoUrl(params.blocks)?.trim() ?? "";
  }
  if (!noiDung) {
    noiDung =
      mediaKind === "photo"
        ? "Ảnh mới"
        : mediaKind === "video"
          ? "Video mới"
          : params.tieuDe.trim();
  }

  let feedTieuDe: string | undefined = params.tieuDe.trim() || undefined;
  if (mediaKind) {
    if (isMediaFallbackTitle(params.tieuDe, mediaKind)) {
      feedTieuDe = undefined;
    } else {
      const captionLine =
        milestoneCardCaptionPlain(null, params.blocks)
          ?.split("\n")[0]
          ?.trim() ?? "";
      if (captionLine && params.tieuDe.trim() === captionLine.slice(0, 120)) {
        feedTieuDe = undefined;
      }
    }
  }

  const mediaIds: string[] =
    mediaKind === "photo"
      ? extractPhotoImageIds(params.blocks)
      : params.coverSeed?.trim()
        ? [params.coverSeed.trim()]
        : [];

  const filterIds = await resolveFilterIdsBySlugs(
    params.orgId,
    params.filterSlugs,
  );
  if (params.filterSlugs.length > 0 && filterIds.length === 0) {
    return { ok: false, error: "Nhãn bài đăng không hợp lệ." };
  }

  const result = await createCongDongPost({
    orgId: params.orgId,
    authorId: params.authorId,
    noiDung,
    tieuDe: feedTieuDe,
    mediaIds,
    filterIds,
    idTacPham: params.tacPhamId,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
