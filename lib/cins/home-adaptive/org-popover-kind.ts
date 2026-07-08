import { truongRootPath } from "@/lib/truong/truong-routes";

export type HaOrgPopoverKind =
  | "cong_dong"
  | "truong"
  | "co_so_dao_tao"
  | "studio";

export function haOrgKindForPopover(
  loai: string | null | undefined,
): HaOrgPopoverKind | null {
  if (loai === "cong_dong") return "cong_dong";
  if (loai === "truong" || loai === "truong_dai_hoc") return "truong";
  if (loai === "co_so_dao_tao") return "co_so_dao_tao";
  if (loai === "studio" || loai === "doanh_nghiep") return "studio";
  return null;
}

export function haOrgProfileHref(loai: string, slug: string): string {
  if (loai === "co_so_dao_tao") return `/co-so/${slug}`;
  if (loai === "truong" || loai === "truong_dai_hoc") return truongRootPath(slug);
  if (loai === "cong_dong") return `/cong-dong/${slug}`;
  if (loai === "studio" || loai === "doanh_nghiep") return `/studio/${slug}`;
  return `/co-so/${slug}`;
}
