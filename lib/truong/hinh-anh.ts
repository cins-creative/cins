export const HINH_ANH_LOAI_VALUES = [
  "khuon_vien",
  "ngoai_khoa",
  "su_kien",
  "hop_tac",
  "xuong",
  "trien_lam",
  "khac",
] as const;

export type HinhAnhLoai = (typeof HINH_ANH_LOAI_VALUES)[number];

export const HINH_ANH_LOAI_OPTIONS: ReadonlyArray<{
  value: HinhAnhLoai;
  label: string;
}> = [
  { value: "khuon_vien", label: "Cơ sở vật chất" },
  { value: "ngoai_khoa", label: "Hoạt động ngoại khóa" },
  { value: "su_kien", label: "Sự kiện" },
  { value: "hop_tac", label: "Hợp tác" },
  { value: "xuong", label: "Xưởng / Studio" },
  { value: "trien_lam", label: "Triển lãm" },
  { value: "khac", label: "Khác" },
];

const LOAI_ALIASES: Record<string, HinhAnhLoai> = {
  campus: "khuon_vien",
  khuon_vien: "khuon_vien",
  co_so_vat_chat: "khuon_vien",
  ngoai_khoa: "ngoai_khoa",
  hoat_dong_ngoai_khoa: "ngoai_khoa",
  su_kien: "su_kien",
  event: "su_kien",
  hop_tac: "hop_tac",
  hop_tac_quoc_te: "hop_tac",
  xuong: "xuong",
  trien_lam: "trien_lam",
  khac: "khac",
};

export function normalizeHinhAnhLoai(raw: unknown): HinhAnhLoai {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  return LOAI_ALIASES[key] ?? "khac";
}

export function labelHinhAnhLoai(loai: string | null | undefined): string {
  const normalized = normalizeHinhAnhLoai(loai);
  return (
    HINH_ANH_LOAI_OPTIONS.find((o) => o.value === normalized)?.label ?? "Khác"
  );
}

export function countHinhAnhByLoai(
  images: ReadonlyArray<{ loai: string | null }>,
): Map<HinhAnhLoai, number> {
  const counts = new Map<HinhAnhLoai, number>();
  for (const img of images) {
    const loai = normalizeHinhAnhLoai(img.loai);
    counts.set(loai, (counts.get(loai) ?? 0) + 1);
  }
  return counts;
}
