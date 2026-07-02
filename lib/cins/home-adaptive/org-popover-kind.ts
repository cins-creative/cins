import { truongRootPath } from "@/lib/truong/truong-routes";

export type HaOrgPopoverKind = "cong_dong" | "truong" | "co_so_dao_tao";

export function haOrgKindForPopover(
  loai: string | null | undefined,
): HaOrgPopoverKind | null {
  if (loai === "cong_dong" || loai === "truong" || loai === "co_so_dao_tao") {
    return loai;
  }
  return null;
}

export function haOrgProfileHref(loai: string, slug: string): string {
  if (loai === "co_so_dao_tao") return `/co-so/${slug}`;
  if (loai === "truong") return truongRootPath(slug);
  if (loai === "cong_dong") return `/cong-dong/${slug}`;
  if (loai === "studio" || loai === "doanh_nghiep") return `/studio/${slug}`;
  return `/co-so/${slug}`;
}
