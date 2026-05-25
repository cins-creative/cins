import type { TruongCauHinhMon, TruongCauHinhTinhDiem } from "@/lib/truong/types";

export type CalcConfigDraft = {
  config: TruongCauHinhTinhDiem;
  heSoOverrides: Record<string, number>;
  selectedPhuongThucIds: string[];
  /** id_mon_thi không tính trong công thức */
  excludedMonIds?: string[];
};

export type MonThiCatalogItem = {
  id: string;
  ten: string;
  loai: string | null;
  ma?: string | null;
  thumbnail_id?: string | null;
  thumbnail_url?: string | null;
};

export function applyCalcDraftMonList(
  config: TruongCauHinhTinhDiem | null | undefined,
  draft: CalcConfigDraft | null | undefined,
): TruongCauHinhMon[] {
  if (!config?.mon?.length) return [];
  const excluded = new Set(draft?.excludedMonIds ?? []);
  return config.mon
    .filter((m) => !excluded.has(m.id_mon_thi))
    .map((m) => ({
      ...m,
      he_so: draft?.heSoOverrides[m.id_mon_thi] ?? m.he_so,
    }));
}

export function isMonExcluded(
  draft: CalcConfigDraft | null | undefined,
  monId: string,
): boolean {
  return (draft?.excludedMonIds ?? []).includes(monId);
}
