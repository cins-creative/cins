"use server";

import {
  getArticleBodyForAdmin,
  listArticlesForAdmin,
  updateArticleForAdmin,
  type AdminArticleDetailRow,
  type AdminArticleListRow,
  type AdminArticlePatch,
} from "@/lib/admin/articles-server";
import type { ArticleMeta } from "@/lib/articles/types";
import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { revalidatePath } from "next/cache";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

async function requireDraftTools(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isInlineArticleEditEnabled()) {
    return {
      ok: false,
      message:
        "Chế độ sửa thử đã tắt. Bật NODE_ENV=development hoặc đặt CINS_INLINE_ARTICLE_EDIT=1.",
    };
  }
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  return { ok: true };
}

export async function adminFetchArticles(): Promise<
  | { ok: true; rows: AdminArticleListRow[] }
  | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };
  return listArticlesForAdmin();
}

export async function adminFetchArticleBody(
  articleId: string,
): Promise<
  { ok: true; row: AdminArticleDetailRow } | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };
  const res = await getArticleBodyForAdmin(articleId);
  return res;
}

export async function adminSaveArticle(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };

  const id = String(formData.get("id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!id || !slug) return { ok: false, message: "Thiếu id hoặc slug." };

  const tieu_de = String(formData.get("tieu_de") ?? "").trim() || "Không tiêu đề";
  const tieu_de_vietRaw = String(formData.get("tieu_de_viet") ?? "").trim();
  const tieu_de_engRaw = String(formData.get("tieu_de_eng") ?? "").trim();
  const tom_tatRaw = String(formData.get("tom_tat") ?? "").trim();
  const noi_dung = String(formData.get("noi_dung") ?? "");
  const trang_thai_noi_dung = String(formData.get("trang_thai_noi_dung") ?? "").trim();
  const allowedStatus = new Set([
    "cho_review",
    "dang_viet",
    "published",
    "archived",
    "merged",
  ]);
  if (!allowedStatus.has(trang_thai_noi_dung)) {
    return { ok: false, message: "Giá trị trạng thái không hợp lệ." };
  }

  const patch: AdminArticlePatch = {
    tieu_de,
    tieu_de_viet: tieu_de_vietRaw ? tieu_de_vietRaw : null,
    tieu_de_eng: tieu_de_engRaw ? tieu_de_engRaw : null,
    tom_tat: tom_tatRaw ? tom_tatRaw : null,
    noi_dung,
    trang_thai_noi_dung,
  };

  if (formData.has("meta_json")) {
    const metaJsonRaw = String(formData.get("meta_json") ?? "").trim();
    if (!metaJsonRaw) {
      patch.meta = {} as ArticleMeta;
    } else {
      try {
        patch.meta = JSON.parse(metaJsonRaw) as ArticleMeta;
      } catch {
        return { ok: false, message: "meta JSON không hợp lệ." };
      }
    }
  }

  const res = await updateArticleForAdmin(id, patch);
  if (!res.ok) return { ok: false, message: res.message };

  revalidatePath("/bai-viet");
  revalidatePath(`/bai-viet/${slug}`);
  revalidatePath("/admin");

  return { ok: true };
}
