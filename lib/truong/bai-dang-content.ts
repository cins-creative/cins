import type { Block } from "@/lib/editor/types";
import {
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
  type GridImage,
} from "@/lib/journey/image-grid";
import { isMilestoneArticleCard } from "@/lib/journey/milestone-card-kind";
import { baiDangCoverDisplayUrl } from "@/lib/truong/bai-dang-cover";
import { baiDangUsesBlocks } from "@/lib/truong/bai-dang-blocks";
import type { TruongBaiDang } from "@/lib/truong/types";

const IMG_SRC_RE = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

/** Số thumbnail hiển thị trước ô «+N» trên card timeline. */
export const BAI_DANG_THUMB_VISIBLE_MAX = 5;

export type BaiDangThumbPreview = {
  /** URL hiển thị trong strip thumbnail (tối đa 5 khi có overflow). */
  previews: string[];
  /** Ô cuối: "+N" (N = tổng ảnh − 5) khi bài có hơn 5 ảnh; null nếu không cần. */
  overflowLabel: string | null;
  /** Tổng số ảnh trong HTML (để a11y / mở rộng sau). */
  totalImages: number;
};

/** Lấy URL ảnh từ HTML nội dung bài (tối đa `limit`). */
export function extractImagesFromBaiDangHtml(
  html: string | null | undefined,
  limit = 4,
): string[] {
  if (!html?.trim()) return [];
  const urls: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  IMG_SRC_RE.lastIndex = 0;
  while ((m = IMG_SRC_RE.exec(html)) !== null && urls.length < limit) {
    const src = m[1]?.trim();
    if (!src || src.startsWith("blob:") || seen.has(src)) continue;
    seen.add(src);
    urls.push(src);
  }
  return urls;
}

/**
 * Strip thumbnail trên card: ≤5 ảnh → hiện hết;
 * >5 ảnh → 5 ảnh đầu + ô "+N" (N = tổng − 5, ví dụ 8 ảnh → +3).
 */
export function buildBaiDangThumbPreview(
  html: string | null | undefined,
): BaiDangThumbPreview {
  const all = extractImagesFromBaiDangHtml(html, 64);
  const total = all.length;
  if (total === 0) {
    return { previews: [], overflowLabel: null, totalImages: 0 };
  }
  if (total <= BAI_DANG_THUMB_VISIBLE_MAX) {
    return { previews: all, overflowLabel: null, totalImages: total };
  }
  const remaining = total - BAI_DANG_THUMB_VISIBLE_MAX;
  return {
    previews: all.slice(0, BAI_DANG_THUMB_VISIBLE_MAX),
    overflowLabel: `+${remaining}`,
    totalImages: total,
  };
}

/** Đếm tổng ảnh trong HTML (không giới hạn). */
export function countImagesInBaiDangHtml(html: string | null | undefined): number {
  if (!html?.trim()) return 0;
  let n = 0;
  IMG_SRC_RE.lastIndex = 0;
  while (IMG_SRC_RE.exec(html)) n += 1;
  return n;
}

export function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Grid ảnh cho bài legacy (HTML + cover) — timeline card photo. */
export function buildLegacyPhotoGridImages(post: TruongBaiDang): GridImage[] | null {
  const urls: string[] = [];
  const seen = new Set<string>();
  const cover = baiDangCoverDisplayUrl(post);
  if (cover) {
    seen.add(cover);
    urls.push(cover);
  }
  for (const url of extractImagesFromBaiDangHtml(post.noi_dung, 32)) {
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  if (!urls.length) return null;
  return urls.map((url, i) => ({
    id: `legacy-img-${i}`,
    previewSrc: url,
    width: GRID_IMAGE_DEFAULT_WIDTH,
    height: GRID_IMAGE_DEFAULT_HEIGHT,
  }));
}

/** Import cũ / excerpt card hay cắt `tom_tat` đúng 200 ký tự. */
export const BAI_DANG_TOM_TAT_LEGACY_TRUNC_LEN = 200;

function htmlBlockToFirstPlainLine(html: string): string {
  const plain = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return plain.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
}

function firstTextLineFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): string {
  if (!blocks?.length) return "";
  for (const block of blocks) {
    if (
      block.loai !== "body" &&
      block.loai !== "h2" &&
      block.loai !== "h3" &&
      block.loai !== "quote"
    ) {
      continue;
    }
    const html = block.config?.html;
    if (typeof html !== "string") continue;
    const line = htmlBlockToFirstPlainLine(html);
    if (line) return line;
  }
  return "";
}

/**
 * Mô tả ngắn đầy đủ cho unfold — khôi phục khi `tom_tat` bị cắt 200 ký tự
 * nhưng `noi_dung` / block text còn bản dài hơn.
 */
export function resolveBaiDangUnfoldTomTat(post: {
  tom_tat?: string | null;
  noi_dung?: string | null;
  noiDungBlocks?: ReadonlyArray<Block> | null;
}): string | null {
  const stored = post.tom_tat?.trim() ?? "";
  const fromBlocks = firstTextLineFromBlocks(post.noiDungBlocks);
  const fromLegacy = post.noi_dung?.trim()
    ? stripHtmlToPlainText(post.noi_dung)
    : "";

  if (stored) {
    const looksTruncated =
      stored.length === BAI_DANG_TOM_TAT_LEGACY_TRUNC_LEN &&
      !stored.endsWith(".") &&
      !stored.endsWith("…");
    if (looksTruncated) {
      for (const full of [fromBlocks, fromLegacy]) {
        if (full.length > stored.length && full.startsWith(stored)) {
          return full;
        }
      }
    }
    return stored;
  }

  if (fromBlocks) return fromBlocks;
  if (fromLegacy) return fromLegacy;
  return null;
}

export function baiDangHasExpandableBody(post: {
  noi_dung?: string | null;
  tom_tat?: string | null;
  noiDungBlocks?: Block[] | null;
  cover_id?: string | null;
  cover_src?: string | null;
}): boolean {
  if (baiDangUsesBlocks(post)) {
    return isMilestoneArticleCard(
      post.noiDungBlocks,
      Boolean(post.cover_id?.trim() || post.cover_src?.trim()),
      post.tom_tat ?? post.noi_dung,
    );
  }
  if (post.noi_dung?.trim()) return true;
  const plain = post.tom_tat?.trim() ?? "";
  return plain.length > 160;
}
