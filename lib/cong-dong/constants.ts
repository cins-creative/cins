/** Context polymorphic của `cong_dong_filter`. */
export const CONG_DONG_FILTER_CONTEXT = {
  CONG_DONG: "cong_dong",
} as const;

export type CongDongFilterContext =
  (typeof CONG_DONG_FILTER_CONTEXT)[keyof typeof CONG_DONG_FILTER_CONTEXT];

/** Polymorphic target cho `social_binh_luan` / `social_reaction` / `social_luu`. */
export const SOCIAL_LOAI_DOI_TUONG = {
  COT_MOC: "cot_moc",
} as const;

export type SocialLoaiDoiTuong =
  (typeof SOCIAL_LOAI_DOI_TUONG)[keyof typeof SOCIAL_LOAI_DOI_TUONG];

/**
 * Chế độ phòng cộng đồng (`org_to_chuc.cau_hinh.che_do`) — L27.
 * `RIENG_TU` chỉ còn alias đọc → map về `bi_mat`.
 */
export const CONG_DONG_CHE_DO = {
  CONG_KHAI: "cong_khai",
  NOI_BO: "noi_bo",
  BI_MAT: "bi_mat",
  /** @deprecated alias legacy — parse thành `bi_mat` */
  RIENG_TU: "rieng_tu",
} as const;

export type CongDongCheDo = "cong_khai" | "noi_bo" | "bi_mat";

export type CongDongJoinMode = "open" | "request" | "invite_only";

export function parseCongDongCheDo(raw: unknown): CongDongCheDo {
  if (raw === CONG_DONG_CHE_DO.NOI_BO) return CONG_DONG_CHE_DO.NOI_BO;
  if (
    raw === CONG_DONG_CHE_DO.BI_MAT ||
    raw === CONG_DONG_CHE_DO.RIENG_TU
  ) {
    return CONG_DONG_CHE_DO.BI_MAT;
  }
  return CONG_DONG_CHE_DO.CONG_KHAI;
}

export function parseCongDongCheDoFromCauHinh(cauHinh: unknown): CongDongCheDo {
  if (!cauHinh || typeof cauHinh !== "object") return CONG_DONG_CHE_DO.CONG_KHAI;
  return parseCongDongCheDo((cauHinh as { che_do?: string }).che_do);
}

/** Hub / search / gợi ý — không gồm bí mật. */
export function canDiscoverCongDong(cheDo: CongDongCheDo): boolean {
  return cheDo !== CONG_DONG_CHE_DO.BI_MAT;
}

/** Trang identity (shell) — bí mật chỉ member. */
export function canViewCongDongShell(
  cheDo: CongDongCheDo,
  isActiveMember: boolean,
): boolean {
  if (cheDo === CONG_DONG_CHE_DO.BI_MAT) return isActiveMember;
  return true;
}

/** Feed bài — công khai cho khách; nội bộ/bí mật chỉ member. */
export function canViewCongDongFeed(
  cheDo: CongDongCheDo,
  isActiveMember: boolean,
): boolean {
  if (cheDo === CONG_DONG_CHE_DO.CONG_KHAI) return true;
  return isActiveMember;
}

export function congDongJoinMode(cheDo: CongDongCheDo): CongDongJoinMode {
  switch (cheDo) {
    case CONG_DONG_CHE_DO.NOI_BO:
      return "request";
    case CONG_DONG_CHE_DO.BI_MAT:
      return "invite_only";
    default:
      return "open";
  }
}

export function congDongCheDoLabel(cheDo: CongDongCheDo): string {
  switch (cheDo) {
    case CONG_DONG_CHE_DO.NOI_BO:
      return "Nội bộ";
    case CONG_DONG_CHE_DO.BI_MAT:
      return "Bí mật";
    default:
      return "Công khai";
  }
}

/** Chuẩn hoá giá trị ghi vào `cau_hinh.che_do` (không ghi alias legacy). */
export function normalizeCongDongCheDoForWrite(raw: unknown): CongDongCheDo {
  return parseCongDongCheDo(raw);
}

export const FEED_PAGE_SIZE = 15;

/** Số ngành đào tạo tối đa gắn với một cộng đồng (`cau_hinh.danh_muc`). */
export const CONG_DONG_CATEGORY_MAX = 3;

/** Số lĩnh vực tối đa gắn với một cộng đồng (`cau_hinh.linh_vuc`). */
export const CONG_DONG_LINH_VUC_MAX = 3;
