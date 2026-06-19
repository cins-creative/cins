/**
 * Article tag reference — bài viết (`article_bai_viet`) gắn vào một tác phẩm
 * (post của user). Junction qua bảng `article_gan_tac_pham`.
 *
 * Editor giữ shape này trong `state.tags`; persist xuống DB chỉ cần `id`,
 * còn `slug/tieu_de/loai_bai_viet` để render chip + link không-fetch-lại.
 */
export type ArticleTagRef = {
  id: string;
  slug: string;
  tieu_de: string;
  loai_bai_viet: string;
  /** Mô tả ngắn — tooltip hover trên Journey / post modal. */
  tom_tat?: string | null;
  /** Bài keyword/entity đã được CINs xác thực — khác thẻ gán thường. */
  da_verify?: boolean;
  /** Slug lĩnh vực (`article_bai_viet.id_linh_vuc`) — dùng filter feed theo lĩnh vực. */
  linh_vuc_slug?: string | null;
};

/* ─── Shared label + color class helpers ─────────────────────────────
 * Dùng chung giữa editor (ArticleTagPicker), JourneyPostBody (hiển thị
 * tag dưới byline) và JourneyMilestoneCard (hiển thị tag trên card).
 * ────────────────────────────────────────────────────────────────── */

export const LOAI_BAI_VIET_LABEL: Record<string, string> = {
  nghe: "Nghề",
  keyword: "Khái niệm",
  phan_mem: "Phần mềm",
  mon_hoc: "Môn học",
  blog: "Blog",
  event: "Sự kiện",
  nganh_dao_tao: "Ngành đào tạo",
  linh_vuc: "Lĩnh vực",
};

export function articleTagLabel(loai: string): string {
  return LOAI_BAI_VIET_LABEL[loai] ?? loai;
}

const KNOWN_LOAI = new Set([
  "nghe",
  "keyword",
  "phan_mem",
  "mon_hoc",
  "blog",
  "event",
  "nganh_dao_tao",
  "linh_vuc",
]);

/** CSS modifier class theo loại (dùng cho dropdown picker + pill hiển thị).
 *  `loai_bai_viet` enum DB dùng `_`, CSS prefer `-` → convert.   */
export function articleTagLoaiClass(loai: string): string {
  const k = KNOWN_LOAI.has(loai) ? loai : "blog";
  return `is-loai-${k.replace(/_/g, "-")}`;
}
