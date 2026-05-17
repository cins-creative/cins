import {
  attachArticleNhomFromGanNhom,
  fetchMonHocDungTrongNganh,
  fetchNgheDungTrongNganh,
  fetchRelatedArticles,
  getArticleBySlug,
  type MonHocForNganhRow,
  type NgheForNganhRow,
} from "@/lib/articles/queries";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import type { ArticleBaiViet, ArticleCard, MetaNganhDaoTao } from "@/lib/articles/types";
import type { NgheArticleHubRow } from "@/lib/articles/types";
import type { NganhDetailArticle, NganhHubItem } from "@/lib/nganh/types";
import type { ParsedNganhNoiDung } from "@/lib/nganh/parseNoiDung";
import { parseEditorialImages } from "@/lib/nganh/editorialImage";
import { parseNganhNoiDung } from "@/lib/nganh/parseNoiDung";

export type MonHocNganhRow = MonHocForNganhRow;
export type NgheNganhRow = NgheForNganhRow;

function parseMetaNganh(meta: ArticleBaiViet["meta"]): MetaNganhDaoTao | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const ma = typeof m.ma_nganh === "string" ? m.ma_nganh.trim() : "";
  const editorial_images = parseEditorialImages(m.editorial_images);
  if (!ma && !editorial_images.length) return null;
  return {
    ma_nganh: ma,
    khoi_thi: Array.isArray(m.khoi_thi)
      ? (m.khoi_thi as string[]).map(String)
      : [],
    mon_nang_khieu:
      typeof m.mon_nang_khieu === "string" ? m.mon_nang_khieu.trim() : null,
    thoi_gian_dao_tao:
      typeof m.thoi_gian_dao_tao === "string"
        ? m.thoi_gian_dao_tao.trim()
        : null,
    editorial_images,
  };
}

function mapRowToNganhHubItem(
  row: NgheArticleHubRow & { meta?: MetaNganhDaoTao | null },
): NganhHubItem {
  const meta = parseMetaNganh(row.meta ?? null);
  const nh =
    row.article_nhom_all?.find((n) => n.loai_nhom === "nhom_nganh") ??
    row.article_nhom;
  return {
    id: row.id,
    slug: row.slug,
    title: row.tieu_de,
    titleEng: row.tieu_de_eng,
    titleVi: row.tieu_de_viet,
    short_description: row.tom_tat,
    ma_nganh: meta?.ma_nganh ?? null,
    khoi_thi: meta?.khoi_thi ?? [],
    cover_id: row.cover_id ?? null,
    article_nhom_id: nh?.id ?? row.article_nhom_id ?? null,
    article_nhom: nh ?? row.article_nhom ?? null,
    article_nhom_all: row.article_nhom_all ?? null,
  };
}

export type ListNganhArticlesResult =
  | { ok: true; items: NganhHubItem[] }
  | { ok: false; items: []; reason: "no_env" | "query_error"; message?: string };

export async function listNganhArticlesForHub(options?: {
  limit?: number;
  nhomNganhId?: string;
}): Promise<ListNganhArticlesResult> {
  if (!hasSupabaseEnv()) {
    return { ok: false, items: [], reason: "no_env" };
  }
  try {
    let items = await loadNganhHubRows();
    const nhomId = options?.nhomNganhId?.trim();
    if (nhomId) {
      items = items.filter((n) =>
        (n.article_nhom_all ?? []).some(
          (nh) => nh.id === nhomId && nh.loai_nhom === "nhom_nganh",
        ),
      );
    }
    const limit = options?.limit ?? 500;
    return { ok: true, items: items.slice(0, limit) };
  } catch (e) {
    return {
      ok: false,
      items: [],
      reason: "query_error",
      message: e instanceof Error ? e.message : undefined,
    };
  }
}

export async function loadNganhHubRows(): Promise<NganhHubItem[]> {
  if (!hasSupabaseEnv()) return [];

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("article_bai_viet")
    .select(
      "id, slug, tieu_de, tieu_de_viet, tieu_de_eng, tom_tat, cover_id, meta",
    )
    .eq("loai_bai_viet", "nganh_dao_tao")
    .eq("trang_thai_noi_dung", "published")
    .order("tieu_de", { ascending: true })
    .limit(500);

  if (error || !data?.length) return [];

  const base: NgheArticleHubRow[] = (data as Record<string, unknown>[]).map(
    (r) => ({
      id: String(r.id),
      slug: String(r.slug ?? ""),
      tieu_de: String(r.tieu_de ?? "").trim() || "Không tiêu đề",
      tieu_de_viet:
        r.tieu_de_viet == null ? null : String(r.tieu_de_viet).trim() || null,
      tieu_de_eng: (r.tieu_de_eng as string | null) ?? null,
      tom_tat: (r.tom_tat as string | null) ?? null,
      cover_id: (r.cover_id as string | null) ?? null,
      linh_vuc_id: null,
      linh_vuc_slugs: null,
      meta: r.meta as MetaNganhDaoTao | null,
    }),
  );

  const withNhom = await attachArticleNhomFromGanNhom(base);
  return withNhom.map((row) => mapRowToNganhHubItem(row));
}

/** Nhãn khối thi — thử `edu_to_hop_mon`, fallback mã trong meta. */
export async function resolveKhoiThiLabels(
  codes: string[],
): Promise<string[]> {
  const list = codes.map((c) => c.trim()).filter(Boolean);
  if (!list.length) return [];
  if (!hasSupabaseEnv()) return list;

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("edu_to_hop_mon")
      .select("ma, ten")
      .in("ma", list);
    if (error || !data?.length) return list;

    const byMa = new Map(
      (data as { ma?: string; ten?: string }[]).map((r) => [
        String(r.ma ?? "").trim(),
        String(r.ten ?? r.ma ?? "").trim(),
      ]),
    );
    return list.map((code) => byMa.get(code) ?? code);
  } catch {
    return list;
  }
}

export type NganhDetailBundle = {
  article: NganhDetailArticle;
  parsed: ParsedNganhNoiDung;
  monHoc: MonHocNganhRow[];
  nghe: NgheNganhRow[];
  khoiThiLabels: string[];
  lienQuan: ArticleCard[];
  soTruong: number;
};

export async function getNganhDetailBySlug(
  slug: string,
): Promise<NganhDetailBundle | null> {
  const raw = await getArticleBySlug(slug);
  if (!raw || raw.loai_bai_viet !== "nganh_dao_tao") return null;
  if (raw.trang_thai_noi_dung !== "published") return null;

  const meta = parseMetaNganh(raw.meta);
  const noiDung = raw.noi_dung ?? raw.noi_dung_markdown ?? null;
  const parsed = parseNganhNoiDung(noiDung);

  const [withNhom] = await attachArticleNhomFromGanNhom([
    {
      id: raw.id,
      slug: raw.slug,
      tieu_de: raw.tieu_de,
      tieu_de_viet: raw.tieu_de_viet ?? null,
      tieu_de_eng: raw.tieu_de_eng ?? null,
      tom_tat: raw.tom_tat ?? null,
      cover_id: raw.cover_id ?? null,
      linh_vuc_id: null,
      linh_vuc_slugs: null,
    },
  ]);

  const nh =
    withNhom.article_nhom_all?.find((n) => n.loai_nhom === "nhom_nganh") ??
    withNhom.article_nhom ??
    null;

  const moTaNgan =
    typeof (raw as { mo_ta_ngan?: string }).mo_ta_ngan === "string"
      ? (raw as { mo_ta_ngan?: string }).mo_ta_ngan
      : null;

  const [monHoc, nghe, khoiThiLabels, lienQuan, soTruong] = await Promise.all([
    fetchMonHocDungTrongNganh(raw.id),
    fetchNgheDungTrongNganh(raw.id),
    resolveKhoiThiLabels(meta?.khoi_thi ?? []),
    fetchRelatedArticles(raw.id),
    countTruongDaoTao(raw.id),
  ]);

  return {
    article: {
      id: raw.id,
      slug: raw.slug,
      tieu_de: raw.tieu_de,
      tieu_de_viet: raw.tieu_de_viet ?? null,
      tieu_de_eng: raw.tieu_de_eng ?? null,
      tom_tat: raw.tom_tat ?? null,
      mo_ta_ngan: moTaNgan,
      noi_dung: noiDung,
      meta,
      cap_nhat_luc: raw.cap_nhat_luc,
      article_nhom: nh,
    },
    parsed,
    monHoc,
    nghe,
    khoiThiLabels,
    lienQuan,
    soTruong,
  };
}

async function countTruongDaoTao(articleId: string): Promise<number> {
  if (!hasSupabaseEnv()) return 0;
  try {
    const supabase = createPublicSupabaseClient();
    const { count, error } = await supabase
      .from("org_truong_nganh")
      .select("id", { count: "exact", head: true })
      .eq("id_nganh", articleId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
