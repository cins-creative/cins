import { congDongRootPath } from "@/lib/cong-dong/routes";
import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { studioTabPath } from "@/lib/to-chuc/studio-routes";
import {
  TRUONG_DEFAULT_TAB,
  truongTabPath,
} from "@/lib/truong/truong-routes";

export const SU_KIEN_LISTING_PATH = "/su-kien";

/** Trang chi tiết sự kiện độc lập: `/su-kien/:slug` (hoặc id khi chưa có slug). */
export function suKienDetailPath(slugOrId: string): string {
  return `${SU_KIEN_LISTING_PATH}/${encodeURIComponent(slugOrId.trim())}`;
}

/** Ưu tiên `slug` công khai; fallback `id` (UUID / legacy). */
export function suKienCardPath(sk: {
  id: string;
  slug?: string | null;
}): string {
  const key = sk.slug?.trim() || sk.id.trim();
  return suKienDetailPath(key);
}

/**
 * Deep-link tab Quản lý trên trang sự kiện độc lập (`/su-kien/{slug}?manage=1`).
 * `orgLoai` / `orgSlug` giữ để tương thích caller; không còn bắt buộc.
 */
export function suKienManageHref(
  _orgLoai: string,
  _orgSlug: string,
  suKienId: string,
  suKienSlug?: string | null,
): string {
  const publicKey = suKienSlug?.trim() || suKienId.trim();
  if (!publicKey) return SU_KIEN_LISTING_PATH;
  return `${suKienDetailPath(publicKey)}?manage=1`;
}

/** Trang sự kiện của org — tab hoặc trang gốc tuỳ loại tổ chức. */
export function orgSuKienHref(loaiToChuc: string, orgSlug: string): string {
  const slug = orgSlug.trim();
  if (loaiToChuc === "co_so_dao_tao") return coSoTabPath(slug, "su-kien");
  if (loaiToChuc === "cong_dong") return congDongRootPath(slug);
  if (loaiToChuc === "studio" || loaiToChuc === "doanh_nghiep") {
    return studioTabPath(slug, "su-kien");
  }
  return truongTabPath(slug, TRUONG_DEFAULT_TAB);
}
