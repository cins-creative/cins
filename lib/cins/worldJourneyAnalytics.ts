import type { MilestoneItem } from "@/components/journey/milestone-types";

/**
 * ID đối tượng analytics của 1 milestone — khớp `id_doi_tuong` client gửi lên
 * `social_luot_xem` và server `demLuotXemCuaViewer`.
 */
export function worldJourneyAnalyticsId(m: MilestoneItem): string {
  if (m.orgSuKienRef?.suKienId) return m.orgSuKienRef.suKienId;
  if (m.orgBaiDangRef?.postId) return m.orgBaiDangRef.postId;
  return m.cotMocId ?? m.id;
}
