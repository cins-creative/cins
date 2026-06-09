import type { Block } from "@/lib/editor/types";
import { isMilestoneArticleCard } from "@/lib/journey/milestone-card-kind";
import { baiDangUsesBlocks } from "@/lib/truong/bai-dang-blocks";

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

export function baiDangHasExpandableBody(post: {
  noi_dung?: string | null;
  tom_tat?: string | null;
  noiDungBlocks?: Block[] | null;
}): boolean {
  if (baiDangUsesBlocks(post)) {
    return isMilestoneArticleCard(post.noiDungBlocks);
  }
  if (post.noi_dung?.trim()) return true;
  const plain = post.tom_tat?.trim() ?? "";
  return plain.length > 160;
}
