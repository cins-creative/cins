"use server";

import {
  countArticleDeleteUsage,
  deleteArticleForAdmin,
  type ArticleDeleteUsage,
} from "@/lib/admin/article-delete";
import {
  createArticleForAdmin,
  getArticleBodyForAdmin,
  listArticleLienQuanForAdmin,
  listArticlesForAdmin,
  searchArticlesForLienQuanPicker,
  syncArticleManagedLienQuan,
  syncArticleOutgoingLienQuan,
  type AdminArticleLienQuanBundle,
  type AdminArticleLienQuanPickerItem,
  updateArticleForAdmin,
  type AdminArticleDetailRow,
  type AdminArticleListRow,
  type AdminArticlePatch,
} from "@/lib/admin/articles-server";
import { parseAdminMonThiForm } from "@/lib/admin/mon-thi-validate";
import {
  countOrgCauHinhMonForMonThi,
  createMonThiForAdmin,
  deleteMonThiForAdmin,
  listMonThiForAdmin,
  updateMonThiForAdmin,
  type AdminMonThiPatch,
  type AdminMonThiRow,
} from "@/lib/admin/mon-thi-server";
import type { ArticleMeta } from "@/lib/articles/types";
import { getCoverUrl } from "@/lib/articles/cover";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";
import { hasAdminDbUrl } from "@/lib/admin/db-url";
import { runAdminSql, type AdminSqlMode, type AdminSqlResult } from "@/lib/admin/sql-runner";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

/* Admin server actions chỉ cần service-role key trên server. Trang
   /admin đã có gate riêng (Supabase auth + SUPABASE_SERVICE_ROLE_KEY).
   Bỏ feature-flag CINS_INLINE_ARTICLE_EDIT vì nó dành cho inline editor
   ở trang public — không liên quan tới admin panel. */
async function requireDraftTools(): Promise<{ ok: true } | { ok: false; message: string }> {
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
  const res = await listArticlesForAdmin();
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, rows: res.rows };
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

export async function adminFetchArticleLienQuan(
  articleId: string,
  loaiBaiViet?: string,
): Promise<
  | { ok: true; bundle: AdminArticleLienQuanBundle }
  | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };
  return listArticleLienQuanForAdmin(articleId, loaiBaiViet);
}

export async function adminSearchArticlesLienQuanPicker(
  articleId: string,
  query: string,
  loaiBaiViet?: string,
): Promise<
  | { ok: true; items: AdminArticleLienQuanPickerItem[] }
  | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };
  return searchArticlesForLienQuanPicker(articleId, query, loaiBaiViet);
}

export async function adminSyncArticleManagedLienQuan(
  articleId: string,
  loaiBaiViet: string,
  targetArticleIds: string[],
): Promise<
  | { ok: true; bundle: AdminArticleLienQuanBundle }
  | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };
  return syncArticleManagedLienQuan(articleId, loaiBaiViet, targetArticleIds);
}

/** @deprecated Dùng `adminSyncArticleManagedLienQuan` */
export async function adminSyncArticleOutgoingLienQuan(
  articleId: string,
  targetArticleIds: string[],
): Promise<
  | { ok: true; bundle: AdminArticleLienQuanBundle }
  | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };
  return syncArticleOutgoingLienQuan(articleId, targetArticleIds);
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

  if (formData.has("cover_id")) {
    const v = String(formData.get("cover_id") ?? "").trim();
    patch.cover_id = v || null;
  }
  if (formData.has("thumbnail")) {
    const v = String(formData.get("thumbnail") ?? "").trim();
    patch.thumbnail = v || null;
  }
  if (formData.has("main_video")) {
    const v = String(formData.get("main_video") ?? "").trim();
    patch.main_video = v || null;
  }

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
  revalidatePath("/nganh-hoc");
  revalidatePath(`/nganh-hoc/${slug}`);
  revalidatePath("/admin");

  return { ok: true };
}

export async function adminCreateArticle(
  formData: FormData,
): Promise<
  { ok: true; id: string; slug: string } | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };

  const tieu_de = String(formData.get("tieu_de") ?? "").trim();
  const loai_bai_viet = String(formData.get("loai_bai_viet") ?? "").trim();
  const idLvRaw = String(formData.get("id_linh_vuc") ?? "").trim();

  const res = await createArticleForAdmin({
    tieu_de,
    slug: String(formData.get("slug") ?? "").trim() || null,
    loai_bai_viet,
    trang_thai_noi_dung: String(formData.get("trang_thai_noi_dung") ?? "").trim(),
    tieu_de_viet: String(formData.get("tieu_de_viet") ?? "").trim() || null,
    tieu_de_eng: String(formData.get("tieu_de_eng") ?? "").trim() || null,
    tom_tat: String(formData.get("tom_tat") ?? "").trim() || null,
    id_linh_vuc: idLvRaw || null,
  });

  if (!res.ok) return res;

  const s = res.slug.trim();
  revalidatePath("/admin/bai-viet");
  revalidatePath("/bai-viet");
  if (s) revalidatePath(`/bai-viet/${s}`);
  if (loai_bai_viet === "nganh_dao_tao") {
    revalidatePath("/nganh-hoc");
    if (s) revalidatePath(`/nganh-hoc/${s}`);
  }
  revalidatePath("/admin");

  return res;
}

const ALLOWED_STATUS = new Set([
  "cho_review",
  "dang_viet",
  "published",
  "archived",
  "merged",
]);

export async function adminUpdateArticleStatus(
  articleId: string,
  slug: string,
  loaiBaiViet: string,
  trang_thai_noi_dung: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireDraftTools();
  if (!gate.ok) return gate;

  const id = articleId.trim();
  const status = trang_thai_noi_dung.trim();
  if (!id) return { ok: false, message: "Thiếu id bài viết." };
  if (!ALLOWED_STATUS.has(status)) {
    return { ok: false, message: "Trạng thái không hợp lệ." };
  }

  const res = await updateArticleForAdmin(id, { trang_thai_noi_dung: status });
  if (!res.ok) return res;

  const s = slug.trim();
  revalidatePath("/admin/bai-viet");
  revalidatePath("/bai-viet");
  if (s) revalidatePath(`/bai-viet/${s}`);
  if (loaiBaiViet.trim() === "nganh_dao_tao") {
    revalidatePath("/nganh-hoc");
    if (s) revalidatePath(`/nganh-hoc/${s}`);
  }

  return { ok: true };
}

export async function updateAdminArticleThumbnail(
  articleId: string,
  formData: FormData,
): Promise<
  | { ok: true; thumbnail: string; thumbnail_url: string }
  | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return gate;

  const id = articleId.trim();
  if (!id) return { ok: false, message: "Thiếu id bài viết." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Chọn file ảnh hợp lệ." };
  }

  const uploaded = await uploadToCloudflareImages(file);
  if (!uploaded.ok) {
    return { ok: false, message: uploaded.error };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("article_bai_viet")
      .update({
        thumbnail: uploaded.data.imageId,
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", id)
      .select("slug, loai_bai_viet")
      .maybeSingle();

    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "Không tìm thấy bài viết." };

    const slug = String(data.slug ?? "").trim();
    const loai = String(data.loai_bai_viet ?? "").trim();

    revalidatePath("/admin/bai-viet");
    revalidatePath("/bai-viet");
    if (slug) revalidatePath(`/bai-viet/${slug}`);
    if (loai === "nganh_dao_tao") {
      revalidatePath("/nganh-hoc");
      if (slug) revalidatePath(`/nganh-hoc/${slug}`);
    }

    rememberCfAccountHashFromDeliveryUrl(uploaded.data.url);
    const thumbnail_url =
      uploaded.data.url ||
      getCoverUrl(uploaded.data.imageId, "thumbnail") ||
      getCoverUrl(uploaded.data.imageId, "public") ||
      "";

    return {
      ok: true,
      thumbnail: uploaded.data.imageId,
      thumbnail_url,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function adminFetchMonThi(): Promise<
  { ok: true; rows: AdminMonThiRow[] } | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };
  const res = await listMonThiForAdmin();
  if (res.ok) revalidatePath("/admin/mon-thi");
  return res;
}

export async function updateAdminMonThiThumbnail(
  monThiId: string,
  formData: FormData,
): Promise<
  | { ok: true; thumbnail_id: string; thumbnail_url: string }
  | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return gate;

  const id = monThiId.trim();
  if (!id) return { ok: false, message: "Thiếu id môn thi." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Chọn file ảnh hợp lệ." };
  }

  const uploaded = await uploadToCloudflareImages(file);
  if (!uploaded.ok) {
    return { ok: false, message: uploaded.error };
  }

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("edu_mon_thi")
      .update({ thumbnail_id: uploaded.data.imageId })
      .eq("id", id);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/admin/mon-thi");

    rememberCfAccountHashFromDeliveryUrl(uploaded.data.url);
    const thumbnail_url =
      uploaded.data.url ||
      getCoverUrl(uploaded.data.imageId, "public") ||
      "";

    return {
      ok: true,
      thumbnail_id: uploaded.data.imageId,
      thumbnail_url,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function adminSaveMonThi(
  formData: FormData,
): Promise<{ ok: boolean; message?: string }> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Thiếu id môn thi." };

  const parsed = parseAdminMonThiForm({
    ten: formData.get("ten"),
    ma: formData.get("ma"),
    loai: formData.get("loai"),
    trang_thai: formData.get("trang_thai"),
    thumbnail_id: formData.get("thumbnail_id"),
    id_bai_viet: formData.get("id_bai_viet"),
  });
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const f = parsed.fields;
  const patch: AdminMonThiPatch = {
    ten: f.ten,
    ma: f.ma,
    loai: f.loai,
    trang_thai: f.trang_thai,
    thumbnail_id: f.thumbnail_id,
    id_bai_viet: f.id_bai_viet,
  };

  const res = await updateMonThiForAdmin(id, patch);
  if (!res.ok) return { ok: false, message: res.message };

  revalidatePath("/admin/mon-thi");
  return { ok: true };
}

export async function adminCreateMonThi(
  formData: FormData,
): Promise<
  { ok: true; row: AdminMonThiRow } | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };

  const parsed = parseAdminMonThiForm({
    ten: formData.get("ten"),
    ma: formData.get("ma"),
    loai: formData.get("loai"),
    trang_thai: formData.get("trang_thai"),
    thumbnail_id: formData.get("thumbnail_id"),
    id_bai_viet: formData.get("id_bai_viet"),
  });
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const f = parsed.fields;
  const res = await createMonThiForAdmin({
    ten: f.ten,
    ma: f.ma,
    loai: f.loai,
    trang_thai: f.trang_thai,
    thumbnail_id: f.thumbnail_id,
    id_bai_viet: f.id_bai_viet,
  });

  if (!res.ok) return res;
  revalidatePath("/admin/mon-thi");
  return res;
}

export async function adminCountMonThiCauHinhUsage(
  id: string,
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };
  return countOrgCauHinhMonForMonThi(id);
}

export async function adminCountArticleDeleteUsage(
  articleId: string,
): Promise<
  { ok: true; usage: ArticleDeleteUsage } | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };
  return countArticleDeleteUsage(articleId);
}

export async function adminDeleteArticle(
  articleId: string,
  slug: string,
  loaiBaiViet: string,
): Promise<
  { ok: true; usage: ArticleDeleteUsage } | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };

  const id = articleId.trim();
  if (!id) return { ok: false, message: "Thiếu id bài viết." };

  const res = await deleteArticleForAdmin(id);
  if (!res.ok) return res;

  const s = slug.trim();
  revalidatePath("/admin/bai-viet");
  revalidatePath("/bai-viet");
  if (s) revalidatePath(`/bai-viet/${s}`);
  if (loaiBaiViet.trim() === "nganh_dao_tao") {
    revalidatePath("/nganh-hoc");
    if (s) revalidatePath(`/nganh-hoc/${s}`);
  }
  revalidatePath("/admin");

  return res;
}

export async function adminDeleteMonThi(
  id: string,
): Promise<
  | { ok: true; unlinkedCauHinhMon: number }
  | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };

  const monId = id.trim();
  if (!monId) return { ok: false, message: "Thiếu id môn thi." };

  const res = await deleteMonThiForAdmin(monId);
  if (!res.ok) return res;

  revalidatePath("/admin/mon-thi");
  return res;
}

export async function adminRunSql(
  query: string,
  mode: AdminSqlMode,
): Promise<
  | { ok: true; result: AdminSqlResult }
  | { ok: false; message: string }
> {
  const gate = await requireDraftTools();
  if (!gate.ok) return { ok: false, message: gate.message };
  if (!hasAdminDbUrl()) {
    return {
      ok: false,
      message:
        "Thiếu SUPABASE_DB_URL (hoặc DATABASE_URL). Thêm connection string Postgres từ Supabase → Database.",
    };
  }

  try {
    const result = await runAdminSql(query, mode);
    return { ok: true, result };
  } catch (err) {
    let message = err instanceof Error ? err.message : "Chạy SQL thất bại.";
    if (/ENOTFOUND/i.test(message)) {
      message +=
        " — Host trong DATABASE_URL không resolve được. Dùng URI pooler (aws-…pooler.supabase.com) copy từ Supabase Connect.";
    } else if (/password authentication failed/i.test(message)) {
      message +=
        " — Đặt SUPABASE_DB_PASSWORD=mật_khẩu_database (plain text) trong .env.local; DATABASE_URL chỉ host+user (postgres.ospzzzxcomrmhqrnkoiw@aws-…pooler…:5432/postgres), không nhét password vào URI.";
    }
    return { ok: false, message };
  }
}
