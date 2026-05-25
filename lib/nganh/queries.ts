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
import {
  countUniqueTruong,
  fetchTruongDaoTaoForNganh,
  type NganhTruongRow,
} from "@/lib/nganh/truong";
import { parseMetaNganhFields } from "@/lib/nganh/media-fields";
import { parseNganhNoiDung } from "@/lib/nganh/parseNoiDung";
import { resolveTruongImageSrc } from "@/lib/truong/media-url";

export type MonHocNganhRow = MonHocForNganhRow;
export type NgheNganhRow = NgheForNganhRow;

function parseMetaNganh(meta: ArticleBaiViet["meta"]): MetaNganhDaoTao | null {
  return parseMetaNganhFields(meta);
}

async function mapRowToNganhHubItem(
  row: NgheArticleHubRow & { meta?: MetaNganhDaoTao | null },
): Promise<NganhHubItem> {
  const meta = parseMetaNganh(row.meta ?? null);
  const nh =
    row.article_nhom_all?.find((n) => n.loai_nhom === "nhom_nganh") ??
    row.article_nhom;
  const cover_id = row.cover_id ?? null;
  const cover_src = cover_id
    ? await resolveTruongImageSrc(cover_id, ["public", "cover", "medium"])
    : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.tieu_de,
    titleEng: row.tieu_de_eng,
    titleVi: row.tieu_de_viet,
    short_description: row.tom_tat,
    ma_nganh: meta?.ma_nganh ?? null,
    khoi_thi: meta?.khoi_thi ?? [],
    cover_id,
    cover_src,
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
  return Promise.all(withNhom.map((row) => mapRowToNganhHubItem(row)));
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
  truong: NganhTruongRow[];
  khoiThiLabels: string[];
  lienQuan: ArticleCard[];
  soTruong: number;
};

export type { NganhTruongRow } from "@/lib/nganh/truong";

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

  const rawRow = raw as unknown as Record<string, unknown>;
  const moTaNgan =
    typeof rawRow.mo_ta_ngan === "string" ? rawRow.mo_ta_ngan : null;
  const thumbnail =
    typeof rawRow.thumbnail === "string"
      ? rawRow.thumbnail.trim() || null
      : null;
  const main_video =
    typeof rawRow.main_video === "string"
      ? rawRow.main_video.trim() || null
      : null;

  const [monHoc, nghe, truong, khoiThiLabels, lienQuan] = await Promise.all([
    fetchMonHocDungTrongNganh(raw.id),
    fetchNgheDungTrongNganh(raw.id),
    fetchTruongDaoTaoForNganh(raw.id),
    resolveKhoiThiLabels(meta?.khoi_thi ?? []),
    fetchRelatedArticles(raw.id),
  ]);

  const soTruong = countUniqueTruong(truong);

  return {
    article: {
      id: raw.id,
      slug: raw.slug,
      tieu_de: raw.tieu_de,
      tieu_de_viet: raw.tieu_de_viet ?? null,
      tieu_de_eng: raw.tieu_de_eng ?? null,
      tom_tat: raw.tom_tat ?? null,
      mo_ta_ngan: moTaNgan,
      cover_id: raw.cover_id ?? null,
      thumbnail,
      main_video,
      noi_dung: noiDung,
      meta,
      cap_nhat_luc: raw.cap_nhat_luc,
      article_nhom: nh,
    },
    parsed,
    monHoc,
    nghe,
    truong,
    khoiThiLabels,
    lienQuan,
    soTruong,
  };
}
