import type {
  MilestoneType,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";

const LOAI_MOC_TO_UI: Record<string, MilestoneType> = {
  hoc: "hoc",
  lam_viec: "lam",
  du_an: "du-an",
  su_kien: "su-kien",
  thanh_tuu: "thanh-tuu",
  ca_nhan: "ca-nhan",
};

const CHE_DO_TO_VIS: Record<string, MilestoneVisibility> = {
  feature: "feature",
  public: "public",
  theo_nhom: "unlisted",
  chi_minh: "private",
};

export function mapLoaiMocToMilestoneType(loaiMoc: string): MilestoneType {
  return LOAI_MOC_TO_UI[loaiMoc] ?? "ca-nhan";
}

export function mapCheDoToMilestoneVisibility(
  cheDo: string,
): MilestoneVisibility {
  return CHE_DO_TO_VIS[cheDo] ?? "public";
}
