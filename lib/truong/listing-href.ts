import { truongDetailHref } from "@/lib/nganh/truong-shared";
import { coSoTabPath, CO_SO_DEFAULT_TAB } from "@/lib/to-chuc/co-so-routes";
import type { TruongListItem } from "@/lib/truong/types";

export function truongListingHref(school: TruongListItem): string {
  if (school.org_loai === "co_so_dao_tao") {
    return coSoTabPath(school.slug, CO_SO_DEFAULT_TAB);
  }
  return truongDetailHref(school.slug);
}