import type { Block } from "@/lib/editor/types";
import { milestoneCardContentKind } from "@/lib/journey/milestone-card-kind";
import {
  validatePostContentForPublish,
  type PostPublishValidationResult,
} from "@/lib/journey/post-content-kind";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";

import type { TruongBaiDang } from "@/lib/truong/types";
import type { BaiDangCardKind } from "@/lib/truong/bai-dang-timeline";
import { baiDangCoverDisplayUrl } from "@/lib/truong/bai-dang-cover";

/** Parse `org_bai_dang.noi_dung_blocks` JSONB từ DB. */
export function parseBaiDangBlocks(raw: unknown): Block[] | null {
  return parseServerBlocks(raw);
}

/** Validate blocks từ API client trước khi ghi DB. */
export function sanitizeBaiDangBlocksInput(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  const out: Block[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.loai !== "string") continue;
    out.push({
      id: typeof obj.id === "string" ? obj.id : `b-${out.length}`,
      loai: obj.loai as Block["loai"],
      thu_tu: typeof obj.thu_tu === "number" ? obj.thu_tu : out.length,
      config:
        obj.config && typeof obj.config === "object"
          ? (obj.config as Record<string, unknown>)
          : {},
    });
  }
  return out;
}

export function baiDangUsesBlocks(
  post: Pick<TruongBaiDang, "noiDungBlocks">,
): boolean {
  return Boolean(post.noiDungBlocks?.length);
}

export function resolveBaiDangCardKind(
  post: TruongBaiDang,
  legacyKind: (p: TruongBaiDang) => BaiDangCardKind,
): BaiDangCardKind {
  if (baiDangUsesBlocks(post)) {
    return milestoneCardContentKind(
      post.noiDungBlocks,
      Boolean(baiDangCoverDisplayUrl(post)),
      post.tom_tat,
    );
  }
  return legacyKind(post);
}

/** Validate `org_bai_dang` blocks — cùng rule Journey user (Phase 1.5). */
export function validateOrgBaiDangContent(params: {
  tomTat?: string | null;
  coverId?: string | null;
  blocks: Block[];
}): PostPublishValidationResult {
  return validatePostContentForPublish({
    moTa: params.tomTat,
    coverId: params.coverId,
    blocks: params.blocks,
  });
}
