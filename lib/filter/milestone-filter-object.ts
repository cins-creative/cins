import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  FILTER_LOAI_COT_MOC,
  FILTER_LOAI_ORG_BAI_DANG,
  type FilterLoaiDoiTuong,
} from "@/lib/filter/types";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export type MilestonePersonalFilterObject = {
  objectId: string;
  loaiDoiTuong: FilterLoaiDoiTuong;
};

/** Bài org verify / gắn thẻ studio — nhãn gắn lên `org_bai_dang`, không phải `content_cot_moc`. */
export function isOrgBaiDangJourneyFilterTarget(item: MilestoneItem): boolean {
  return Boolean(
    item.orgBaiDangRef?.postId &&
      (item.variant === "verified" || item.variant === "tagged") &&
      item.bookmark,
  );
}

export function resolveMilestonePersonalFilterObject(
  item: MilestoneItem,
): MilestonePersonalFilterObject | null {
  if (isOrgBaiDangJourneyFilterTarget(item) && item.orgBaiDangRef?.postId) {
    return {
      objectId: item.orgBaiDangRef.postId,
      loaiDoiTuong: FILTER_LOAI_ORG_BAI_DANG,
    };
  }
  const objectId = item.cotMocId ?? item.id;
  if (!objectId || !UUID_RE.test(objectId)) return null;
  return { objectId, loaiDoiTuong: FILTER_LOAI_COT_MOC };
}
