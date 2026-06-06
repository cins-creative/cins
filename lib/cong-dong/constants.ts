/** Context đa hình của `content_thao_luan` — không hard-code rải rác. */
export const THAO_LUAN_LOAI_CONTEXT = {
  CONG_DONG: "cong_dong",
} as const;

export type ThaoLuanLoaiContext =
  (typeof THAO_LUAN_LOAI_CONTEXT)[keyof typeof THAO_LUAN_LOAI_CONTEXT];

export const THAO_LUAN_LOAI_POST = {
  THAO_LUAN: "thao_luan",
  CAU_HOI: "cau_hoi",
} as const;

/** Polymorphic target cho `social_binh_luan` / `social_reaction`. */
export const SOCIAL_LOAI_DOI_TUONG = {
  COT_MOC: "cot_moc",
  THAO_LUAN: "thao_luan",
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
