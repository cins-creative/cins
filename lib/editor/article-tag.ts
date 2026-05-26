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
};
