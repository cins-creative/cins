/** Nhãn hiển thị cho `article_lien_quan.loai_quan_he` (enum → chữ). */
export const LOAI_QUAN_HE_LABELS: Record<string, string> = {
  LIEN_QUAN: "Liên quan",
  THUOC_LINH_VUC: "Thuộc lĩnh vực",
  DUNG_TRONG_NGHE: "Dùng trong nghề",
  TIEN_QUYET: "Tiên quyết",
};

export function labelLoaiQuanHe(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Liên quan";
  const k = raw.trim();
  return LOAI_QUAN_HE_LABELS[k] ?? k.replace(/_/g, " ");
}
