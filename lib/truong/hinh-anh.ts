export const HINH_ANH_LOAI_VALUES = [
  "khuon_vien",
  "xuong",
  "trien_lam",
  "khac",
] as const;

export type HinhAnhLoai = (typeof HINH_ANH_LOAI_VALUES)[number];

const LOAI_ALIASES: Record<string, HinhAnhLoai> = {
  campus: "khuon_vien",
  khuon_vien: "khuon_vien",
  xuong: "xuong",
  trien_lam: "trien_lam",
  khac: "khac",
};

export function normalizeHinhAnhLoai(raw: unknown): HinhAnhLoai {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  return LOAI_ALIASES[key] ?? "khuon_vien";
}
