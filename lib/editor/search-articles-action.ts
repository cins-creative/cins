"use server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Server action — tìm `article_bai_viet` theo `tieu_de` để gắn làm tag cho
 * một post trong editor. Auth bắt buộc (chống guest scrape danh sách
 * article); chỉ trả về cột công khai (id/slug/tieu_de/loai_bai_viet) +
 * filter `trang_thai_noi_dung = 'published'` để không leak nháp.
 *
 * Empty `query` → trả top 12 bài mới cập nhật (làm "browse" mặc định khi
 * dropdown vừa mở).
 *
 * Note: client picker ưu tiên `loadAllArticlesForTagPicker()` + filter
 * client-side. Hàm này giữ làm fallback cho UX server-side search nếu
 * cache miss / muốn refresh.
 */
export async function searchArticlesForTag(
  query: string,
): Promise<ArticleTagRef[]> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) return [];

  const q = (query || "").trim();
  const admin = createServiceRoleClient();

  /* `published` only — `published` là trạng thái duy nhất an toàn để hiển
     thị cho user khác làm tag (cho_review/dang_viet/archived/merged đều
     không nên expose). */
  let req = admin
    .from("article_bai_viet")
    .select("id, slug, tieu_de, loai_bai_viet")
    .eq("trang_thai_noi_dung", "published")
    .order("cap_nhat_luc", { ascending: false })
    .limit(12);

  if (q) {
    /* Escape `%` và `_` để user gõ literal — Supabase không tự escape ILIKE
       pattern. `,` cũng phải escape vì supabase-js parse list. */
    const safe = q.replace(/[%_,]/g, "\\$&");
    req = req.ilike("tieu_de", `%${safe}%`);
  }

  const { data, error } = await req;
  if (error || !data) return [];

  return data.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    tieu_de: String(row.tieu_de ?? "").trim() || "Không tiêu đề",
    loai_bai_viet: String(row.loai_bai_viet ?? "").trim() || "blog",
  }));
}

/**
 * Load bulk — trả về toàn bộ article_bai_viet `published` cho TagPicker,
 * cap 2000 dòng (tránh transfer payload quá lớn). Client cache vào
 * sessionStorage, filter local cho instant search + infinite scroll.
 *
 * Order theo `cap_nhat_luc DESC` để bài mới sửa luôn ưu tiên đầu list khi
 * empty query — match UX của `searchArticlesForTag` "browse mặc định".
 *
 * Estimate: id (36B) + slug (~30B) + title (~50B) + loai (~10B) ≈ 130B/row
 * → 2000 rows ≈ 260KB JSON, gzip xuống còn ~80KB → chấp nhận được cho
 * 1 lần load mỗi session.
 */
const TAG_PICKER_MAX_ROWS = 2000;

export async function loadAllArticlesForTagPicker(): Promise<ArticleTagRef[]> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) return [];

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("article_bai_viet")
    .select("id, slug, tieu_de, loai_bai_viet")
    .eq("trang_thai_noi_dung", "published")
    .order("cap_nhat_luc", { ascending: false })
    .limit(TAG_PICKER_MAX_ROWS);

  if (error || !data) return [];

  return data.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    tieu_de: String(row.tieu_de ?? "").trim() || "Không tiêu đề",
    loai_bai_viet: String(row.loai_bai_viet ?? "").trim() || "blog",
  }));
}
