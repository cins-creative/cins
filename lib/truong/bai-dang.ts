/** Loại bài đăng org — khớp enum DB sau migrate `org-bai-dang-loai-su-kien.sql`. */
export const BAI_DANG_LOAI_VALUES = [
  "thong_bao",
  "tuyen_sinh",
  "hoc_bong",
  "su_kien",
  "khac",
] as const;

export type BaiDangLoai = (typeof BAI_DANG_LOAI_VALUES)[number];

export const BAI_DANG_LOAI_LABELS: Record<BaiDangLoai, string> = {
  thong_bao: "Thông báo",
  tuyen_sinh: "Tuyển sinh",
  hoc_bong: "Học bổng",
  su_kien: "Sự kiện",
  khac: "Khác",
};

/** CSS class trên timeline (org-tl-dot.*). */
export const BAI_DANG_LOAI_CSS: Record<BaiDangLoai, string> = {
  thong_bao: "thongbao",
  tuyen_sinh: "tuyensinh",
  hoc_bong: "hocbong",
  su_kien: "sukien",
  khac: "thongbao",
};

const LOAI_ALIASES: Record<string, BaiDangLoai> = {
  thong_bao: "thong_bao",
  tuyen_sinh: "tuyen_sinh",
  hoc_bong: "hoc_bong",
  su_kien: "su_kien",
  khac: "khac",
  trien_lam: "su_kien",
  showcase: "su_kien",
};

export function normalizeLoaiBaiDang(raw: unknown): BaiDangLoai {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  return LOAI_ALIASES[key] ?? "thong_bao";
}

/**
 * Loại bài đăng đặc thù studio/doanh nghiệp được giữ nguyên (không normalize về
 * 5 loại chuẩn). Hiện chỉ có `showcase` — tab Showcase trang studio.
 */
export const ORG_BAI_DANG_PASSTHROUGH_LOAI = ["showcase"] as const;

/**
 * Chuẩn hóa `loai_bai_dang` cho ghi DB nhưng cho phép một số loại đặc thù
 * (vd. `showcase`) đi thẳng — dùng ở API POST/PATCH bài đăng org.
 */
export function resolveOrgBaiDangLoaiForWrite(raw: unknown): string {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  if ((ORG_BAI_DANG_PASSTHROUGH_LOAI as readonly string[]).includes(key)) {
    return key;
  }
  return normalizeLoaiBaiDang(raw);
}

export function loaiBaiDangLabel(raw: unknown): string {
  return BAI_DANG_LOAI_LABELS[normalizeLoaiBaiDang(raw)];
}

export function loaiBaiDangCssClass(raw: unknown): string {
  return BAI_DANG_LOAI_CSS[normalizeLoaiBaiDang(raw)];
}
