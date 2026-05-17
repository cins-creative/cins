import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";
import type { ArticleMeta } from "@/lib/articles/types";

export type AdminArticleListRow = {
  id: string;
  slug: string;
  tieu_de: string;
  tieu_de_viet: string | null;
  tieu_de_eng: string | null;
  loai_bai_viet: string;
  tom_tat: string | null;
  trang_thai_noi_dung: string;
  cap_nhat_luc: string;
};

export type AdminArticleDetailRow = AdminArticleListRow & {
  noi_dung: string | null;
  noi_dung_markdown: string | null;
  meta: ArticleMeta;
};

export async function listArticlesForAdmin(): Promise<
  | { ok: true; rows: AdminArticleListRow[] }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select(
        "id, slug, tieu_de, tieu_de_viet, tieu_de_eng, loai_bai_viet, tom_tat, trang_thai_noi_dung, cap_nhat_luc",
      )
      .order("cap_nhat_luc", { ascending: false })
      .limit(500);
    if (error) return { ok: false, message: error.message };
    return { ok: true, rows: (data ?? []) as AdminArticleListRow[] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function getArticleBodyForAdmin(
  id: string,
): Promise<
  | { ok: true; row: AdminArticleDetailRow }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .select(
        "id, slug, tieu_de, tieu_de_viet, tieu_de_eng, loai_bai_viet, tom_tat, noi_dung, noi_dung_markdown, meta, trang_thai_noi_dung, cap_nhat_luc",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "Không tìm thấy bài viết." };
    return { ok: true, row: data as AdminArticleDetailRow };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export type AdminArticlePatch = {
  tieu_de?: string;
  tieu_de_viet?: string | null;
  tieu_de_eng?: string | null;
  tom_tat?: string | null;
  noi_dung?: string | null;
  meta?: ArticleMeta | null;
  trang_thai_noi_dung?: string;
};

export async function updateArticleForAdmin(
  id: string,
  patch: AdminArticlePatch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  try {
    const supabase = createServiceRoleClient();
    const cap_nhat_luc = new Date().toISOString();
    const payload = Object.fromEntries(
      [...Object.entries(patch), ["cap_nhat_luc", cap_nhat_luc]].filter(
        ([, v]) => v !== undefined,
      ),
    );
    const { error } = await supabase
      .from("article_bai_viet")
      .update(payload)
      .eq("id", id);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}
