import "server-only";

import type { MilestoneVisibility } from "@/components/journey/milestone-types";

/** Cột mốc chỉ hiện feed cộng đồng — ẩn khỏi Journey public của người khác. */
export const CHE_DO_MOC_CONG_DONG = "cong_dong" as const;

export type CheDoHienThiMoc =
  | "public"
  | "theo_nhom"
  | "chi_minh"
  | "feature"
  | typeof CHE_DO_MOC_CONG_DONG;

/**
 * PostgREST: loại bài `cong_dong` khi viewer không phải chủ Journey.
 * Gom mọi query Journey public qua helper này — không rải `.neq` thủ công.
 */
export function applyJourneyPublicVisibilityFilter<
  T extends { neq: (col: string, val: string) => T },
>(query: T, options: { isOwner: boolean }): T {
  if (options.isOwner) return query;
  return query.neq("che_do_hien_thi", CHE_DO_MOC_CONG_DONG);
}

/** Lọc in-memory sau fetch (bookmarks, tagged, merge lists). */
export function isMilestoneVisibleOnPublicJourney(params: {
  cheDoHienThi: string;
  isOwner: boolean;
}): boolean {
  if (params.isOwner) return true;
  return params.cheDoHienThi !== CHE_DO_MOC_CONG_DONG;
}

/** Map DB `che_do_hien_thi` → badge UI trên Journey card. */
export function mapCheDoToMilestoneVisibility(
  cheDo: string,
): MilestoneVisibility {
  if (cheDo === "feature") return "feature";
  if (cheDo === CHE_DO_MOC_CONG_DONG) return "cong-dong";
  if (cheDo === "chi_minh") return "private";
  if (cheDo === "theo_nhom") return "unlisted";
  return "public";
}
