import { orgPublicHref } from "@/lib/search/helpers";

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
  const normalized =
    loai === "truong" ? "truong_dai_hoc" : loai === "doanh_nghiep" ? "studio" : loai;
  return orgPublicHref(normalized, slug);
}
