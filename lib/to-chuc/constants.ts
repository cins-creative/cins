/** Loại cơ sở đào tạo — enum `loai_co_so_enum` (SCHEMA). */
export const LOAI_CO_SO_OPTIONS = [
  { value: "trung_tam", label: "Trung tâm đào tạo" },
  { value: "truong_nghe", label: "Trường nghề" },
  { value: "co_so_tu_nhan", label: "Cơ sở tư nhân" },
  { value: "chi_nhanh", label: "Chi nhánh" },
] as const;

export type LoaiCoSo = (typeof LOAI_CO_SO_OPTIONS)[number]["value"];

export const LOAI_CO_SO_SET = new Set<string>(LOAI_CO_SO_OPTIONS.map((o) => o.value));

export function labelLoaiCoSo(value: string | null | undefined): string {
  const key = (value ?? "").trim();
  const hit = LOAI_CO_SO_OPTIONS.find((o) => o.value === key);
  return hit?.label ?? key.replace(/_/g, " ");
}
