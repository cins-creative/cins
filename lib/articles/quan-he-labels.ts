/** Nhãn hiển thị cho `article_lien_quan.loai_quan_he` (enum → chữ). */
export const LOAI_QUAN_HE_LABELS: Record<string, string> = {
  LIEN_QUAN: "Liên quan",
  THUOC_LINH_VUC: "Thuộc lĩnh vực",
  DUNG_TRONG_NGHE: "Dùng trong nghề",
  DUNG_TRONG_NGANH: "Dùng trong ngành",
  TIEN_QUYET: "Tiên quyết",
  MON_HOC_LIEN_QUAN: "Môn học liên quan",
  KEYWORD_LIEN_QUAN: "Keyword liên quan",
  PHAN_MEM_LIEN_QUAN: "Phần mềm liên quan",
  NGANH_SU_DUNG: "Ngành sử dụng",
  BAI_VIET_LIEN_QUAN: "Bài viết liên quan",
};

export function labelLoaiQuanHe(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Liên quan";
  const k = raw.trim();
  return LOAI_QUAN_HE_LABELS[k] ?? k.replace(/_/g, " ");
}
