import {
  congDongRootPath,
  congDongSuKienManagePath,
} from "@/lib/cong-dong/routes";
import { coSoSuKienManagePath, coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { studioSuKienManagePath, studioTabPath } from "@/lib/to-chuc/studio-routes";
import {
  TRUONG_DEFAULT_TAB,
  truongTabPath,
} from "@/lib/truong/truong-routes";

export const SU_KIEN_LISTING_PATH = "/su-kien";

/** Trang chi tiết sự kiện độc lập: `/su-kien/:suKienId`. */
export function suKienDetailPath(suKienId: string): string {
  return `${SU_KIEN_LISTING_PATH}/${encodeURIComponent(suKienId.trim())}`;
}

/** Deep-link tab quản lý theo loại org (admin duyệt nội dung quầy). */
export function suKienManageHref(
  orgLoai: string,
  orgSlug: string,
  suKienId: string,
): string {
  const slug = orgSlug.trim();
  const id = suKienId.trim();
  if (!slug || !id) return suKienDetailPath(suKienId);
  if (orgLoai === "co_so_dao_tao") return coSoSuKienManagePath(slug, id);
  if (orgLoai === "studio" || orgLoai === "doanh_nghiep") {
    return studioSuKienManagePath(slug, id);
  }
  if (orgLoai === "cong_dong") return congDongSuKienManagePath(slug, id);
  return `${suKienDetailPath(id)}?manage=1`;
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
