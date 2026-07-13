import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { STUDIO_DEFAULT_TAB, studioTabPath } from "@/lib/to-chuc/studio-routes";
import {
  TRUONG_DEFAULT_TAB,
  truongTabPath,
} from "@/lib/truong/truong-routes";

export const SU_KIEN_LISTING_PATH = "/su-kien";

/** Trang sự kiện của org — tab hoặc trang gốc tuỳ loại tổ chức. */
export function orgSuKienHref(loaiToChuc: string, orgSlug: string): string {
  const slug = orgSlug.trim();
  if (loaiToChuc === "co_so_dao_tao") return coSoTabPath(slug, "su-kien");
  if (loaiToChuc === "cong_dong") return `/cong-dong/${encodeURIComponent(slug)}`;
  if (loaiToChuc === "studio" || loaiToChuc === "doanh_nghiep") {
    return studioTabPath(slug, STUDIO_DEFAULT_TAB);
  }
  return truongTabPath(slug, TRUONG_DEFAULT_TAB);
}
