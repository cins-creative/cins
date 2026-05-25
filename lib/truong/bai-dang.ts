/** Loại bài đăng org — khớp enum DB sau migrate `org-bai-dang-loai-su-kien.sql`. */
export const BAI_DANG_LOAI_VALUES = [
  "thong_bao",
  "tuyen_sinh",
  "su_kien",
  "khac",
] as const;

export type BaiDangLoai = (typeof BAI_DANG_LOAI_VALUES)[number];

export const BAI_DANG_LOAI_LABELS: Record<BaiDangLoai, string> = {
  thong_bao: "Thông báo",
  tuyen_sinh: "Tuyển sinh",
  su_kien: "Sự kiện",
  khac: "Khác",
};

/** CSS class trên timeline (org-tl-dot.*). */
export const BAI_DANG_LOAI_CSS: Record<BaiDangLoai, string> = {
  thong_bao: "thongbao",
  tuyen_sinh: "tuyensinh",
  su_kien: "sukien",
  khac: "thongbao",
};

const LOAI_ALIASES: Record<string, BaiDangLoai> = {
  thong_bao: "thong_bao",
  tuyen_sinh: "tuyen_sinh",
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

export function loaiBaiDangLabel(raw: unknown): string {
  return BAI_DANG_LOAI_LABELS[normalizeLoaiBaiDang(raw)];
}

export function loaiBaiDangCssClass(raw: unknown): string {
  return BAI_DANG_LOAI_CSS[normalizeLoaiBaiDang(raw)];
}
