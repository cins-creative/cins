import {
  attachArticleNhomFromGanNhom,
  fetchMonHocDungTrongNganh,
  fetchNgheDungTrongNganh,
  fetchRelatedArticles,
  getArticleBySlug,
  mapNgheArticleHubRow,
  type MonHocForNganhRow,
  type NgheForNganhRow,
} from "@/lib/articles/queries";
import { getCoverUrl } from "@/lib/articles/cover";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { describeFetchFailure } from "@/lib/supabase/errors";
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

export type MonHocNganhRow = MonHocForNganhRow;
export type NgheNganhRow = NgheForNganhRow;

const NGANH_HUB_BASE_SELECT =
  "id, slug, tieu_de, tieu_de_viet, tieu_de_eng, tom_tat, meta_description, cover_id, thumbnail, meta";

const NGANH_HUB_WITH_NHOM_EMBED = `${NGANH_HUB_BASE_SELECT}, article_gan_nhom(id_nhom, article_nhom(id, slug, ten, mo_ta, thu_tu, loai_nhom))`;

function escapeIlikePattern(q: string): string {
  return q.replace(/[%_\\]/g, "\\$&");
}

function parseMetaNganh(meta: ArticleBaiViet["meta"]): MetaNganhDaoTao | null {
  return parseMetaNganhFields(meta);
}

type NganhHubRawRow = NgheArticleHubRow & { meta?: MetaNganhDaoTao | null };

function mapNganhHubRawRow(r: Record<string, unknown>): NganhHubRawRow {
  return {
    ...mapNgheArticleHubRow(r),
    meta: (r.meta as MetaNganhDaoTao | null) ?? null,
  };
}

function resolveNganhCoverSrc(row: {
  thumbnail?: string | null;
  cover_id?: string | null;
}): string | null {
  return (
    getCoverUrl(row.thumbnail) ??
    getCoverUrl(row.cover_id, "thumbnail") ??
    getCoverUrl(row.cover_id, "public")
  );
}

function mapRowToNganhHubItem(row: NganhHubRawRow): NganhHubItem {
  const meta = parseMetaNganh(row.meta ?? null);
  const nh =
    row.article_nhom_all?.find((n) => n.loai_nhom === "nhom_nganh") ??
    row.article_nhom;
  const cover_id = row.cover_id ?? null;
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
    cover_src: resolveNganhCoverSrc(row),
    article_nhom_id: nh?.id ?? row.article_nhom_id ?? null,
    article_nhom: nh ?? row.article_nhom ?? null,
    article_nhom_all: row.article_nhom_all ?? null,
  };
}

export type ListNganhArticlesResult =
  | { ok: true; items: NganhHubItem[] }
  | { ok: false; items: []; reason: "no_env" | "query_error"; message?: string };

async function baiIdsForNhomNganh(nhomNganhId: string): Promise<string[]> {
  const supabase = createPublicSupabaseClient();
  const { data: gan } = await supabase
    .from("article_gan_nhom")
    .select("id_bai_viet, id_nhom")
    .eq("id_nhom", nhomNganhId);
  const ids = [
    ...new Set(
      (gan ?? [])
        .map((r) => String((r as { id_bai_viet?: string }).id_bai_viet ?? "").trim())
        .filter(Boolean),
    ),
  ];
  if (!ids.length) return [];

  const { data: nhoms } = await supabase
    .from("article_nhom")
    .select("id")
    .eq("id", nhomNganhId)
    .eq("loai_nhom", "nhom_nganh")
    .maybeSingle();
  if (!nhoms) return [];
  return ids;
}

async function fetchNganhHubRawRows(options?: {
  limit?: number;
  nhomNganhId?: string;
  q?: string;
}): Promise<NganhHubRawRow[]> {
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 500);
  const nhomNganhId = options?.nhomNganhId?.trim() ?? "";
  const searchText = options?.q?.trim() ?? "";
  const supabase = createPublicSupabaseClient();

  const runList = async (select: string, baiIds?: string[] | null) => {
    let q = supabase
      .from("article_bai_viet")
      .select(select)
      .eq("loai_bai_viet", "nganh_dao_tao")
      .eq("trang_thai_noi_dung", "published")
      .order("tieu_de", { ascending: true })
      .limit(limit);
    if (baiIds?.length) q = q.in("id", baiIds);
    if (searchText) {
      const esc = escapeIlikePattern(searchText);
      q = q.or(
        `tieu_de.ilike.%${esc}%,slug.ilike.%${esc}%,tieu_de_viet.ilike.%${esc}%,tieu_de_eng.ilike.%${esc}%,tom_tat.ilike.%${esc}%,meta_description.ilike.%${esc}%`,
      );
    }
    return q;
  };

  let rows: Record<string, unknown>[] | null = null;
  let hasNhomEmbed = false;
  let baiIds: string[] | null = null;

  if (nhomNganhId && !searchText) {
    baiIds = await baiIdsForNhomNganh(nhomNganhId);
    if (!baiIds.length) return [];
  }

  const withNhom = await runList(NGANH_HUB_WITH_NHOM_EMBED, baiIds);
  if (!withNhom.error && withNhom.data != null) {
    rows = withNhom.data as unknown as Record<string, unknown>[];
    hasNhomEmbed = true;
  } else {
    const plain = await runList(NGANH_HUB_BASE_SELECT, baiIds);
    if (plain.error || !plain.data) return [];
    rows = plain.data as unknown as Record<string, unknown>[];
  }

  let base = rows.map(mapNganhHubRawRow);
  if (!hasNhomEmbed) {
    base = await attachArticleNhomFromGanNhom(base);
  }
  return base;
}

export async function listNganhArticlesForHub(options?: {
  limit?: number;
  nhomNganhId?: string;
  q?: string;
}): Promise<ListNganhArticlesResult> {
  if (!hasSupabaseEnv()) {
    return { ok: false, items: [], reason: "no_env" };
  }
  try {
    const rows = await fetchNganhHubRawRows(options);
    return { ok: true, items: rows.map(mapRowToNganhHubItem) };
  } catch (e) {
    return {
      ok: false,
      items: [],
      reason: "query_error",
      message: describeFetchFailure(e),
    };
  }
}

/** @deprecated Dùng `listNganhArticlesForHub`. */
export async function loadNganhHubRows(): Promise<NganhHubItem[]> {
  const result = await listNganhArticlesForHub({ limit: 500 });
  return result.ok ? result.items : [];
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
      meta_description: (raw as { meta_description?: string | null }).meta_description ?? null,
      cover_id: raw.cover_id ?? null,
      thumbnail: (raw as { thumbnail?: string | null }).thumbnail ?? null,
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
