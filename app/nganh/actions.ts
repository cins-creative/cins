"use server";

import { revalidatePath } from "next/cache";

import type { MonHocCapDoValue } from "@/lib/articles/queries";
import { fetchMonHocDungTrongNganh } from "@/lib/articles/queries";
import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import type { MonHocNganhWithCapDo } from "@/lib/nganh/monHoc";
import {
  fetchTruongDaoTaoForNganhAdmin,
  type NganhTruongRow,
} from "@/lib/nganh/truong";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";
import { slugifyNganhTitle, uniqueNganhArticleSlug } from "@/lib/nganh/hub-slug";
import { resolveTruongImageSrc } from "@/lib/truong/media-url";
import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

export type TruongPickerItem = {
  id: string;
  slug: string;
  title: string;
  ma_truong: string | null;
};

function slugifyProgramPart(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultThoiGianThang(metaText: string | null | undefined): number {
  const m = (metaText ?? "").match(/(\d+)\s*năm/i);
  if (m?.[1]) {
    const years = Number(m[1]);
    if (Number.isFinite(years) && years > 0) return years * 12;
  }
  return 48;
}

async function uniqueProgramSlug(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orgSlug: string,
  nganhSlug: string,
): Promise<string> {
  const base = slugifyProgramPart(`${orgSlug}-${nganhSlug}`) || "chuong-trinh";
  let candidate = base.slice(0, 96);
  let n = 2;
  while (n < 50) {
    const { data } = await supabase
      .from("org_truong_nganh")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base.slice(0, 88)}-${n}`;
    n += 1;
  }
  return `${base.slice(0, 80)}-${Date.now()}`;
}

async function requireNganhAdmin(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  if (!isInlineArticleEditEnabled()) {
    return {
      ok: false,
      message:
        "Chế độ quản trị đã tắt. Bật NODE_ENV=development hoặc CINS_INLINE_ARTICLE_EDIT=1.",
    };
  }
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  return { ok: true };
}

export async function addMonHocToNganh(
  nganhArticleId: string,
  nganhSlug: string,
  monSlug: string,
  cap_do: MonHocCapDoValue,
): Promise<
  | { ok: true; items: MonHocNganhWithCapDo[] }
  | { ok: false; message: string }
> {
  const gate = await requireNganhAdmin();
  if (!gate.ok) return gate;

  const slug = monSlug.trim();
  if (!slug) return { ok: false, message: "Nhập slug môn học." };

  try {
    const supabase = createServiceRoleClient();
    const { data: mon, error: eMon } = await supabase
      .from("article_bai_viet")
      .select("id, slug, loai_bai_viet")
      .eq("slug", slug)
      .maybeSingle();

    if (eMon) return { ok: false, message: eMon.message };
    if (!mon?.id) return { ok: false, message: "Không tìm thấy bài môn học." };
    if (mon.loai_bai_viet !== "mon_hoc") {
      return { ok: false, message: "Bài viết không phải loại mon_hoc." };
    }

    const { error: eIns } = await supabase.from("article_lien_quan").upsert(
      {
        id_bai_viet_a: mon.id,
        id_bai_viet_b: nganhArticleId,
        loai_quan_he: "DUNG_TRONG_NGANH",
        cap_do,
      },
      { onConflict: "id_bai_viet_a,id_bai_viet_b,loai_quan_he" },
    );

    if (eIns) return { ok: false, message: eIns.message };

    revalidatePath(`/nganh-hoc/${nganhSlug}`);
    const items = await fetchMonHocDungTrongNganh(nganhArticleId);
    return { ok: true, items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export type MonHocPickerItem = {
  id: string;
  slug: string;
  title: string;
  cover_id: string | null;
};

const MON_HOC_PICKER_LIMIT = 500;

/** Danh sách bài `mon_hoc` khi thêm vào ngành (chế độ quản trị). */
export async function searchMonHocPicker(
  query: string,
  excludeIds: string[] = [],
): Promise<
  | { ok: true; items: MonHocPickerItem[] }
  | { ok: false; message: string }
> {
  const gate = await requireNganhAdmin();
  if (!gate.ok) return gate;

  try {
    const supabase = createServiceRoleClient();
    const q = query.trim();

    let req = supabase
      .from("article_bai_viet")
      .select("id, slug, tieu_de_viet, tieu_de, cover_id")
      .eq("loai_bai_viet", "mon_hoc")
      .eq("trang_thai_noi_dung", "published")
      .order("tieu_de_viet", { ascending: true })
      .limit(MON_HOC_PICKER_LIMIT);

    if (q.length > 0) {
      const safe = q.replace(/[%_,"()]/g, "").trim();
      if (safe) {
        const pattern = `%${safe}%`;
        req = req.or(
          `slug.ilike.${pattern},tieu_de_viet.ilike.${pattern},tieu_de.ilike.${pattern}`,
        );
      }
    }

    const { data, error } = await req;
    if (error) return { ok: false, message: error.message };

    const exclude = new Set(excludeIds);
    const items: MonHocPickerItem[] = (data ?? [])
      .filter((row) => !exclude.has(String(row.id)))
      .map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        title: String(row.tieu_de_viet ?? row.tieu_de ?? row.slug).trim(),
        cover_id:
          row.cover_id == null ? null : String(row.cover_id).trim() || null,
      }));

    return { ok: true, items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function addMonHocBatchToNganh(
  nganhArticleId: string,
  nganhSlug: string,
  monSlugs: string[],
  cap_do: MonHocCapDoValue,
): Promise<
  | { ok: true; items: MonHocNganhWithCapDo[]; added: number }
  | { ok: false; message: string }
> {
  const gate = await requireNganhAdmin();
  if (!gate.ok) return gate;

  const slugs = [...new Set(monSlugs.map((s) => s.trim()).filter(Boolean))];
  if (!slugs.length) {
    return { ok: false, message: "Chọn ít nhất một môn học." };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: mons, error: eMon } = await supabase
      .from("article_bai_viet")
      .select("id, slug, loai_bai_viet")
      .in("slug", slugs)
      .eq("loai_bai_viet", "mon_hoc");

    if (eMon) return { ok: false, message: eMon.message };

    const rows = (mons ?? []).filter(
      (m) => m?.id && slugs.includes(String(m.slug)),
    );
    if (!rows.length) {
      return { ok: false, message: "Không tìm thấy môn học đã chọn." };
    }

    const { error: eIns } = await supabase.from("article_lien_quan").upsert(
      rows.map((mon) => ({
        id_bai_viet_a: mon.id,
        id_bai_viet_b: nganhArticleId,
        loai_quan_he: "DUNG_TRONG_NGANH",
        cap_do,
      })),
      { onConflict: "id_bai_viet_a,id_bai_viet_b,loai_quan_he" },
    );

    if (eIns) return { ok: false, message: eIns.message };

    revalidatePath(`/nganh-hoc/${nganhSlug}`);
    const items = await fetchMonHocDungTrongNganh(nganhArticleId);
    return { ok: true, items, added: rows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

/** Gợi ý trường ĐH khi gắn vào ngành (chế độ quản trị). */
export async function searchTruongPicker(
  query: string,
  excludeOrgIds: string[] = [],
): Promise<
  | { ok: true; items: TruongPickerItem[] }
  | { ok: false; message: string }
> {
  const gate = await requireNganhAdmin();
  if (!gate.ok) return gate;

  try {
    const supabase = createServiceRoleClient();
    const q = query.trim();

    let req = supabase
      .from("org_to_chuc")
      .select(
        `
        id,
        slug,
        ten,
        org_truong_dai_hoc!inner ( ma_truong )
      `,
      )
      .order("ten", { ascending: true })
      .limit(40);

    if (q.length > 0) {
      const safe = q.replace(/[%_,"()]/g, "").trim();
      if (safe) {
        const pattern = `%${safe}%`;
        req = req.or(
          `slug.ilike.${pattern},ten.ilike.${pattern}`,
        );
      }
    }

    const { data, error } = await req;
    if (error) return { ok: false, message: error.message };

    const exclude = new Set(excludeOrgIds);
    const items: TruongPickerItem[] = (data ?? [])
      .filter((row) => !exclude.has(String(row.id)))
      .map((row) => {
        const otd = row.org_truong_dai_hoc as
          | { ma_truong?: string | null }
          | { ma_truong?: string | null }[]
          | null;
        const ma =
          Array.isArray(otd) ? otd[0]?.ma_truong : otd?.ma_truong;
        return {
          id: String(row.id),
          slug: String(row.slug),
          title: String(row.ten ?? row.slug).trim(),
          ma_truong: ma?.trim() || null,
        };
      });

    return { ok: true, items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function addTruongToNganh(
  nganhArticleId: string,
  nganhSlug: string,
  orgSlug: string,
): Promise<
  | { ok: true; items: NganhTruongRow[] }
  | { ok: false; message: string }
> {
  const gate = await requireNganhAdmin();
  if (!gate.ok) return gate;

  const slug = orgSlug.trim();
  if (!slug) return { ok: false, message: "Chọn trường để thêm." };

  try {
    const supabase = createServiceRoleClient();

    const { data: org, error: eOrg } = await supabase
      .from("org_to_chuc")
      .select("id, slug, ten, org_truong_dai_hoc!inner ( ma_truong )")
      .eq("slug", slug)
      .maybeSingle();

    if (eOrg) return { ok: false, message: eOrg.message };
    if (!org?.id) return { ok: false, message: "Không tìm thấy trường." };

    const orgId = String(org.id);

    const { data: nganh, error: eNganh } = await supabase
      .from("article_bai_viet")
      .select("id, slug, tieu_de_viet, tieu_de, meta")
      .eq("id", nganhArticleId)
      .maybeSingle();

    if (eNganh) return { ok: false, message: eNganh.message };
    if (!nganh?.id) return { ok: false, message: "Không tìm thấy bài ngành." };

    const nganhTitle = String(
      nganh.tieu_de_viet ?? nganh.tieu_de ?? "Ngành",
    ).trim();
    const meta = nganh.meta as { thoi_gian_dao_tao?: string | null } | null;

    const { data: existing } = await supabase
      .from("org_truong_nganh")
      .select("id")
      .eq("id_nganh", nganhArticleId)
      .eq("id_to_chuc", orgId)
      .maybeSingle();

    if (existing?.id) {
      const { error: eUp } = await supabase
        .from("org_truong_nganh")
        .update({ trang_thai_chuong_trinh: "dang_tuyen" })
        .eq("id", existing.id);
      if (eUp) return { ok: false, message: eUp.message };
    } else {
      const programSlug = await uniqueProgramSlug(
        supabase,
        String(org.slug),
        String(nganh.slug),
      );
      const { error: eIns } = await supabase.from("org_truong_nganh").insert({
        id_nganh: nganhArticleId,
        id_to_chuc: orgId,
        trang_thai_chuong_trinh: "dang_tuyen",
        ten_chuong_trinh: nganhTitle,
        he_dao_tao: "dai_hoc",
        thoi_gian_thang: defaultThoiGianThang(meta?.thoi_gian_dao_tao),
        slug: programSlug,
      });
      if (eIns) return { ok: false, message: eIns.message };
    }

    revalidatePath(`/nganh-hoc/${nganhSlug}`);
    const items = await fetchTruongDaoTaoForNganhAdmin(nganhArticleId);
    return { ok: true, items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function removeTruongFromNganh(
  nganhArticleId: string,
  nganhSlug: string,
  programId: string,
): Promise<
  | { ok: true; items: NganhTruongRow[] }
  | { ok: false; message: string }
> {
  const gate = await requireNganhAdmin();
  if (!gate.ok) return gate;

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("org_truong_nganh")
      .delete()
      .eq("id", programId)
      .eq("id_nganh", nganhArticleId);

    if (error) return { ok: false, message: error.message };

    revalidatePath(`/nganh-hoc/${nganhSlug}`);
    const items = await fetchTruongDaoTaoForNganhAdmin(nganhArticleId);
    return { ok: true, items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function updateNganhHubCover(
  articleId: string,
  formData: FormData,
): Promise<
  | { ok: true; cover_id: string; cover_url: string }
  | { ok: false; message: string }
> {
  const gate = await requireNganhAdmin();
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
        cover_id: uploaded.data.imageId,
        cap_nhat_luc: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("loai_bai_viet", "nganh_dao_tao")
      .select("slug")
      .maybeSingle();

    if (error) return { ok: false, message: error.message };
    if (!data) return { ok: false, message: "Không tìm thấy bài ngành." };

    const slug = String(data.slug ?? "").trim();
    revalidatePath("/nganh-hoc", "page");
    if (slug) revalidatePath(`/nganh-hoc/${slug}`, "page");

    const cover_url =
      uploaded.data.url ||
      (await resolveTruongImageSrc(uploaded.data.imageId, [
        "public",
        "cover",
        "medium",
      ])) ||
      "";

    return {
      ok: true,
      cover_id: uploaded.data.imageId,
      cover_url,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export type CreateNganhFromHubInput = {
  tieu_de_viet: string;
  ma_nganh?: string;
  nhomId?: string | null;
};

export async function createNganhFromHub(
  input: CreateNganhFromHubInput,
): Promise<
  | { ok: true; id: string; slug: string }
  | { ok: false; message: string }
> {
  const gate = await requireNganhAdmin();
  if (!gate.ok) return gate;

  const titleVi = input.tieu_de_viet.trim();
  if (!titleVi) return { ok: false, message: "Nhập tên ngành (tiếng Việt)." };

  const maRaw = (input.ma_nganh ?? "").trim();
  const nhomId = (input.nhomId ?? "").trim() || null;

  try {
    const supabase = createServiceRoleClient();
    const baseSlug = slugifyNganhTitle(titleVi) || slugifyNganhTitle(maRaw);
    const slug = await uniqueNganhArticleSlug(async (candidate) => {
      const { data } = await supabase
        .from("article_bai_viet")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      return Boolean(data);
    }, baseSlug);

    const meta = {
      ma_nganh: maRaw || slug.replace(/-/g, "").slice(0, 12).toUpperCase(),
      khoi_thi: [] as string[],
    };

    const now = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("article_bai_viet")
      .insert({
        slug,
        tieu_de: titleVi,
        tieu_de_viet: titleVi,
        loai_bai_viet: "nganh_dao_tao",
        trang_thai_noi_dung: "published",
        tom_tat: null,
        noi_dung: "",
        meta,
        tao_luc: now,
        cap_nhat_luc: now,
      })
      .select("id, slug")
      .single();

    if (error) return { ok: false, message: error.message };

    const articleId = String(row.id);
    const articleSlug = String(row.slug ?? slug);

    if (nhomId) {
      const { data: nhom } = await supabase
        .from("article_nhom")
        .select("id, loai_nhom")
        .eq("id", nhomId)
        .maybeSingle();
      if (nhom && String(nhom.loai_nhom) === "nhom_nganh") {
        const { error: linkErr } = await supabase.from("article_gan_nhom").insert({
          id_bai_viet: articleId,
          id_nhom: nhomId,
        });
        if (linkErr) {
          return {
            ok: false,
            message: `Đã tạo bài nhưng gán nhóm thất bại: ${linkErr.message}`,
          };
        }
      }
    }

    revalidatePath("/nganh-hoc");
    revalidatePath(`/nganh-hoc/${articleSlug}`);
    return { ok: true, id: articleId, slug: articleSlug };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function removeNganhFromNhom(
  articleId: string,
  nhomId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireNganhAdmin();
  if (!gate.ok) return gate;

  const artId = articleId.trim();
  const groupId = nhomId.trim();
  if (!artId || !groupId) {
    return { ok: false, message: "Thiếu id bài viết hoặc id nhóm." };
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: nhom } = await supabase
      .from("article_nhom")
      .select("id, loai_nhom")
      .eq("id", groupId)
      .maybeSingle();
    if (!nhom || String(nhom.loai_nhom) !== "nhom_nganh") {
      return { ok: false, message: "Nhóm ngành không hợp lệ." };
    }

    const { error } = await supabase
      .from("article_gan_nhom")
      .delete()
      .eq("id_bai_viet", artId)
      .eq("id_nhom", groupId);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/nganh-hoc");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export async function removeMonHocFromNganh(
  nganhArticleId: string,
  nganhSlug: string,
  monArticleId: string,
): Promise<
  | { ok: true; items: MonHocNganhWithCapDo[] }
  | { ok: false; message: string }
> {
  const gate = await requireNganhAdmin();
  if (!gate.ok) return gate;

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("article_lien_quan")
      .delete()
      .eq("id_bai_viet_a", monArticleId)
      .eq("id_bai_viet_b", nganhArticleId)
      .eq("loai_quan_he", "DUNG_TRONG_NGANH");

    if (error) return { ok: false, message: error.message };

    revalidatePath(`/nganh-hoc/${nganhSlug}`);
    const items = await fetchMonHocDungTrongNganh(nganhArticleId);
    return { ok: true, items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}
