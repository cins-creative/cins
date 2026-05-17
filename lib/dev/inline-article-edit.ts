/**
 * Chế độ chỉnh sửa bài thử (không auth): bật khi `NODE_ENV=development`
 * hoặc `CINS_INLINE_ARTICLE_EDIT=true|1`. Chỉ dùng nội bộ / bản thử.
 */
export function isInlineArticleEditEnabled(): boolean {
  const v = process.env.CINS_INLINE_ARTICLE_EDIT?.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  return process.env.NODE_ENV === "development";
}
