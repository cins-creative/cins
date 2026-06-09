import { truongDetailHref } from "@/lib/nganh/truong-shared";
import type { TruongListItem } from "@/lib/truong/types";

export function truongListingHref(school: TruongListItem): string {
  if (school.org_loai === "co_so_dao_tao") {
    return `/co-so/${school.slug}`;
  }
  return truongDetailHref(school.slug);
}
