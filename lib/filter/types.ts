export type PersonalFilter = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thuTu: number;
  /** Số cột mốc/bài đang gắn nhãn — optional khi list. */
  count?: number;
};

export type PersonalFilterRef = {
  id: string;
  slug: string;
  ten: string;
  mau: string | null;
};

export const FILTER_LOAI_COT_MOC = "cot_moc" as const;
export const FILTER_LOAI_ORG_BAI_DANG = "org_bai_dang" as const;

export type FilterLoaiDoiTuong =
  | typeof FILTER_LOAI_COT_MOC
  | typeof FILTER_LOAI_ORG_BAI_DANG;
