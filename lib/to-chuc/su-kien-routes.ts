import { congDongRootPath } from "@/lib/cong-dong/routes";
import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { studioTabPath } from "@/lib/to-chuc/studio-routes";
import {
  TRUONG_DEFAULT_TAB,
  truongTabPath,
} from "@/lib/truong/truong-routes";

export const SU_KIEN_LISTING_PATH = "/events";

/** Chế độ xem tab Quầy — query `?quay=shop|mat-hang|hang`. */
export const SU_KIEN_QUAY_VIEWS = ["shop", "mat-hang", "hang"] as const;
export type SuKienQuayView = (typeof SU_KIEN_QUAY_VIEWS)[number];
/** Mặc định: lưới mặt hàng (không phải danh sách shop). */
export const SU_KIEN_QUAY_VIEW_DEFAULT: SuKienQuayView = "mat-hang";

export function parseSuKienQuayView(
  raw: string | null | undefined,
): SuKienQuayView | null {
  const v = raw?.trim().toLowerCase();
  if (v === "shop" || v === "mat-hang" || v === "hang") return v;
  return null;
}

/**
 * Gắn / đổi `?quay=` trên pathname hiện tại (standalone · co-so · cộng đồng).
 * Giữ các query khác (`manage`, …).
 */
export function withSuKienQuayView(
  pathname: string,
  view: SuKienQuayView,
  currentSearch?: string | URLSearchParams | null,
): string {
  const params =
    currentSearch instanceof URLSearchParams
      ? new URLSearchParams(currentSearch)
      : new URLSearchParams(currentSearch?.replace(/^\?/, "") ?? "");
  params.set("quay", view);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Bỏ `?quay=` khi rời tab Quầy. */
export function withoutSuKienQuayView(
  pathname: string,
  currentSearch?: string | URLSearchParams | null,
): string {
  const params =
    currentSearch instanceof URLSearchParams
      ? new URLSearchParams(currentSearch)
      : new URLSearchParams(currentSearch?.replace(/^\?/, "") ?? "");
  params.delete("quay");
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Deep-link tab Quầy trên trang `/events/{slug}`.
 * VD: `/events/{slug}?quay=hang`
 */
export function suKienQuayViewHref(
  slugOrId: string,
  view: SuKienQuayView = SU_KIEN_QUAY_VIEW_DEFAULT,
  currentSearch?: string | URLSearchParams | null,
): string {
  return withSuKienQuayView(suKienDetailPath(slugOrId), view, currentSearch);
}

/** Trang chi tiết sự kiện độc lập: `/events/:slug` (hoặc id khi chưa có slug). */
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
 * Deep-link tab Quản lý trên trang sự kiện độc lập (`/events/{slug}?manage=1`).
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
