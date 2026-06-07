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

export const CONG_DONG_CHE_DO = {
  CONG_KHAI: "cong_khai",
  RIENG_TU: "rieng_tu",
} as const;

export type CongDongCheDo =
  (typeof CONG_DONG_CHE_DO)[keyof typeof CONG_DONG_CHE_DO];

export const FEED_PAGE_SIZE = 15;

/** Số bài nghề/ngành tối đa gắn với một cộng đồng (`cau_hinh.danh_muc`). */
export const CONG_DONG_CATEGORY_MAX = 4;
