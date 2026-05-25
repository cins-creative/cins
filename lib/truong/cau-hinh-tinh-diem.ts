import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCoverUrl } from "@/lib/articles/cover";
import {
  resolveCatalogThumbnailId,
  resolveMonThiThumbDisplayUrl,
} from "@/lib/truong/mon-thi-thumbnail";

import type { TruongCauHinhMon, TruongCauHinhTinhDiem } from "./types";

/**
 * Luồng dữ liệu (schema v5):
 * org_to_chuc (trường) → org_truong_nganh (chương trình ngành tại trường)
 *   → org_cau_hinh_khoi (khối thi / năm / id_truong_nganh) → edu_to_hop_mon (H00, …)
 *   → org_cau_hinh_mon → edu_mon_thi
 */

/** Seed SQL / docs cũ — org_cau_hinh_khoi gắn id này. */
const MTS_SEED_ORG_ID = "a1000000-0000-0000-0000-000000000001";

/** Trang web `dai-hoc-my-thuat-tp-hcm` — org_to_chuc thật trên production. */
const MTS_LIVE_ORG_ID = "eb825d71-5ac1-4c9f-934f-870402923b91";

/**
 * Khi live org chưa có org_cau_hinh_khoi, đọc từ seed org (cùng mã ngành, khác UUID).
 * Chạy `org-truong-migrate-cau-hinh-mts-live-org.sql` để copy vĩnh viễn sang live.
 */
const ORG_CAU_HINH_FALLBACK: Record<string, string> = {
  [MTS_LIVE_ORG_ID]: MTS_SEED_ORG_ID,
};

/** Org seed để copy metadata khối khi live org chưa có bản ghi. */
export function getOrgCauHinhFallbackOrgId(orgId: string): string | null {
  return ORG_CAU_HINH_FALLBACK[orgId.trim()] ?? null;
}

function isMtsOrgId(orgId: string): boolean {
  const id = orgId.trim();
  return id === MTS_SEED_ORG_ID || id === MTS_LIVE_ORG_ID;
}

/** Legacy ↔ active org_truong_nganh (seed sync — org-truong-sync-cau-hinh-mts-active-nganh.sql). */
const MTS_TRUONG_NGANH_ALIASES: Record<string, string> = {
  "8587b0ad-bf39-4067-84d4-42985da696f5": "b6d1939b-fe77-4ece-b5a0-f9cc78c4533e",
  "b6d1939b-fe77-4ece-b5a0-f9cc78c4533e": "8587b0ad-bf39-4067-84d4-42985da696f5",
  "7ebfae95-9c11-429f-b609-c19233b633bb": "be66ebb8-54b5-4252-bddc-e579745e4824",
  "be66ebb8-54b5-4252-bddc-e579745e4824": "7ebfae95-9c11-429f-b609-c19233b633bb",
  "ad39ae8b-5083-4b9d-9ba2-8984ca28ac3a": "d35d558f-2880-4e6f-9c6b-4b59eedddde5",
  "d35d558f-2880-4e6f-9c6b-4b59eedddde5": "ad39ae8b-5083-4b9d-9ba2-8984ca28ac3a",
  "203aa27c-e442-4ebc-9f43-bc1c72f39c4f": "dc1f5d04-d98a-4dcd-abba-5ae5e8be0e9b",
  "dc1f5d04-d98a-4dcd-abba-5ae5e8be0e9b": "203aa27c-e442-4ebc-9f43-bc1c72f39c4f",
};

type RawKhoiHead = {
  id?: string;
  nam_ap_dung?: number;
  quy_ve_thang?: number;
  diem_san_xet_tuyen?: number | null;
  id_truong_nganh?: string | null;
  id_to_hop_mon?: string | null;
  edu_module_tinh_diem?:
    | { co_diem_uu_tien?: boolean; co_diem_thuong?: boolean }
    | { co_diem_uu_tien?: boolean; co_diem_thuong?: boolean }[]
    | null;
  edu_to_hop_mon?:
    | { id?: string; ma_to_hop?: string | null; ten_to_hop?: string | null }
    | { id?: string; ma_to_hop?: string | null; ten_to_hop?: string | null }[]
    | null;
};

type RawMonRow = {
  id_mon_thi?: string;
  he_so?: number;
  thang_diem?: number;
  thoi_gian_phut?: number | null;
  so_thu_tu?: number;
  ghi_chu?: string | null;
};

function pickOne<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed;
}

type MonCatalogEntry = {
  ten: string;
  loai: string | null;
  ma: string | null;
  thumbnail_id: string | null;
  id_bai_viet: string | null;
  thumbnail_url: string | null;
};

async function fetchArticleCoverMap(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  articleIds: string[],
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (!articleIds.length) return out;

  const { data, error } = await supabase
    .from("article_bai_viet")
    .select("id, cover_id")
    .in("id", articleIds);

  if (error || !data) return out;

  for (const row of data) {
    const r = row as { id?: string; cover_id?: string | null };
    const id = r.id?.trim();
    if (!id) continue;
    out.set(id, getCoverUrl(r.cover_id) ?? null);
  }
  return out;
}

async function fetchMonCatalog(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  monIds: string[],
): Promise<Map<string, MonCatalogEntry>> {
  if (!monIds.length) return new Map();

  const { data, error } = await supabase
    .from("edu_mon_thi")
    .select("id, ten, loai, ma, thumbnail_id, id_bai_viet")
    .in("id", monIds);

  if (error || !data) return new Map();

  const rawRows: {
    id: string;
    ten: string;
    loai: string | null;
    ma: string | null;
    thumbnail_id: string | null;
    id_bai_viet: string | null;
  }[] = [];

  for (const row of data) {
    const r = row as {
      id?: string;
      ten?: string;
      loai?: string | null;
      ma?: string | null;
      thumbnail_id?: string | null;
      id_bai_viet?: string | null;
    };
    const id = r.id?.trim();
    const ten = r.ten?.trim();
    if (!id || !ten) continue;
    const loai = r.loai ?? null;
    rawRows.push({
      id,
      ten,
      loai,
      ma: r.ma?.trim() || null,
      thumbnail_id: resolveCatalogThumbnailId(r.thumbnail_id, loai),
      id_bai_viet: r.id_bai_viet?.trim() || null,
    });
  }

  const articleIds = [
    ...new Set(rawRows.map((r) => r.id_bai_viet).filter((x): x is string => !!x)),
  ];
  const articleCoverById = await fetchArticleCoverMap(supabase, articleIds);

  const map = new Map<string, MonCatalogEntry>();
  await Promise.all(
    rawRows.map(async (r) => {
      const thumbnail_url = await resolveMonThiThumbDisplayUrl({
        thumbnail_id: r.thumbnail_id,
        id_bai_viet: r.id_bai_viet,
        articleCoverById,
      });
      map.set(r.id, {
        ten: r.ten,
        loai: r.loai,
        ma: r.ma,
        thumbnail_id: r.thumbnail_id,
        id_bai_viet: r.id_bai_viet,
        thumbnail_url,
      });
    }),
  );
  return map;
}

async function fetchToHopMonLabel(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  idToHopMon: string | null | undefined,
): Promise<{ ma: string | null; ten: string | null } | null> {
  const id = idToHopMon?.trim();
  if (!id) return null;

  const { data } = await supabase
    .from("edu_to_hop_mon")
    .select("ma_to_hop, ten_to_hop")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const row = data as { ma_to_hop?: string | null; ten_to_hop?: string | null };
  return {
    ma: row.ma_to_hop?.trim() || null,
    ten: row.ten_to_hop?.trim() || null,
  };
}

function mapMonRows(
  rows: RawMonRow[],
  catalog: Map<string, MonCatalogEntry>,
): TruongCauHinhMon[] {
  const mon: TruongCauHinhMon[] = [];
  for (const m of rows) {
    const idMon = m.id_mon_thi?.trim();
    if (!idMon) continue;
    const cat = catalog.get(idMon);
    const ten = cat?.ten ?? m.ghi_chu?.trim();
    if (!ten) continue;
    mon.push({
      id_mon_thi: idMon,
      ten,
      loai: cat?.loai ?? null,
      ma: cat?.ma ?? null,
      thumbnail_id: cat?.thumbnail_id ?? null,
      thumbnail_url: cat?.thumbnail_url ?? null,
      he_so: typeof m.he_so === "number" ? m.he_so : 1,
      thang_diem: typeof m.thang_diem === "number" ? m.thang_diem : 10,
      thoi_gian_phut:
        typeof m.thoi_gian_phut === "number" ? m.thoi_gian_phut : null,
      so_thu_tu: typeof m.so_thu_tu === "number" ? m.so_thu_tu : 0,
      ghi_chu: m.ghi_chu?.trim() || null,
    });
  }
  mon.sort((a, b) => a.so_thu_tu - b.so_thu_tu);
  return mon;
}

async function buildFromKhoiHead(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  head: RawKhoiHead,
): Promise<TruongCauHinhTinhDiem | null> {
  if (!head.id?.trim()) return null;

  const { data: monRows, error: monErr } = await supabase
    .from("org_cau_hinh_mon")
    .select(
      "id_mon_thi, he_so, thang_diem, thoi_gian_phut, so_thu_tu, ghi_chu",
    )
    .eq("id_cau_hinh_khoi", head.id.trim())
    .order("so_thu_tu", { ascending: true });

  if (monErr) return null;

  const rows = (monRows ?? []) as RawMonRow[];
  const ids = [
    ...new Set(
      rows.map((r) => r.id_mon_thi?.trim()).filter((id): id is string => !!id),
    ),
  ];
  const catalog = await fetchMonCatalog(supabase, ids);
  const mon = mapMonRows(rows, catalog);

  const mod = pickOne(head.edu_module_tinh_diem);
  const hop = pickOne(head.edu_to_hop_mon);
  let khoiThi = hop
    ? {
        id: head.id_to_hop_mon?.trim() ?? hop.id?.trim() ?? "",
        ma: hop.ma_to_hop ?? null,
        ten: hop.ten_to_hop ?? null,
      }
    : null;

  if (!khoiThi?.ten && head.id_to_hop_mon) {
    const label = await fetchToHopMonLabel(supabase, head.id_to_hop_mon);
    if (label) {
      khoiThi = { id: head.id_to_hop_mon.trim(), ...label };
    }
  }

  return {
    id: head.id.trim(),
    nam_ap_dung:
      typeof head.nam_ap_dung === "number" ? head.nam_ap_dung : undefined,
    quy_ve_thang:
      typeof head.quy_ve_thang === "number" ? head.quy_ve_thang : 30,
    diem_san_xet_tuyen:
      typeof head.diem_san_xet_tuyen === "number"
        ? head.diem_san_xet_tuyen
        : null,
    co_diem_uu_tien: mod?.co_diem_uu_tien ?? false,
    co_diem_thuong: mod?.co_diem_thuong ?? false,
    id_truong_nganh: head.id_truong_nganh?.trim() ?? null,
    khoiThi,
    mon,
  };
}

const KHOI_HEAD_SELECT = `
  id,
  nam_ap_dung,
  quy_ve_thang,
  diem_san_xet_tuyen,
  id_truong_nganh,
  id_to_hop_mon,
  edu_module_tinh_diem ( co_diem_uu_tien, co_diem_thuong )
`;

type KhoiQueryOpts = {
  /** Một hoặc nhiều org_truong_nganh.id (legacy + active cùng mã ngành). */
  truongNganhIds?: string[];
  schoolWide?: boolean;
  nam?: number;
  namLte?: number;
  limit?: number;
};

/**
 * MTS (và trường khác) có thể có 2 dòng org_truong_nganh cho cùng ngành:
 * UUID "active" trên UI vs UUID "legacy" trong seed org_cau_hinh_khoi.
 * Gom mọi id cùng ma_nganh / slug bài viết / id_nganh.
 */
export async function expandTruongNganhIdsForCalc(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
  truongNganhId: string,
  opts?: { anchorOrgId?: string },
): Promise<string[]> {
  const primary = truongNganhId.trim();
  const targetOrg = orgId.trim();
  const anchorOrg = opts?.anchorOrgId?.trim() || targetOrg;
  const ids = new Set<string>();

  if (targetOrg === anchorOrg) {
    ids.add(primary);
    if (isMtsOrgId(targetOrg)) {
      const alias = MTS_TRUONG_NGANH_ALIASES[primary];
      if (alias) ids.add(alias);
    }
  }

  const { data: anchor, error: anchorErr } = await supabase
    .from("org_truong_nganh")
    .select(
      `
      id_nganh,
      article_bai_viet!inner (
        slug,
        meta
      )
    `,
    )
    .eq("id", primary)
    .eq("id_to_chuc", anchorOrg)
    .maybeSingle();

  if (anchorErr || !anchor) return [...ids];

  const art = pickOne(
    (anchor as { article_bai_viet?: unknown }).article_bai_viet,
  ) as { slug?: string | null; meta?: { ma_nganh?: string } | null } | null;

  const maNganh =
    typeof art?.meta === "object" && art.meta && "ma_nganh" in art.meta
      ? String(art.meta.ma_nganh ?? "").trim()
      : "";
  const slug = art?.slug?.trim() || "";
  const idNganh = (anchor as { id_nganh?: string }).id_nganh?.trim();

  const { data: rows } = await supabase
    .from("org_truong_nganh")
    .select(
      `
      id,
      id_nganh,
      article_bai_viet!inner ( slug, meta )
    `,
    )
    .eq("id_to_chuc", targetOrg);

  for (const row of rows ?? []) {
    const r = row as {
      id?: string;
      id_nganh?: string;
      article_bai_viet?:
        | { slug?: string; meta?: { ma_nganh?: string } }
        | { slug?: string; meta?: { ma_nganh?: string } }[]
        | null;
    };
    const rid = r.id?.trim();
    if (!rid) continue;
    const a = pickOne(r.article_bai_viet);
    const rowMa =
      typeof a?.meta === "object" && a.meta && "ma_nganh" in a.meta
        ? String(a.meta.ma_nganh ?? "").trim()
        : "";
    const rowSlug = a?.slug?.trim() || "";
    if (maNganh && rowMa === maNganh) {
      ids.add(rid);
      continue;
    }
    if (slug && rowSlug === slug) {
      ids.add(rid);
      continue;
    }
    if (idNganh && r.id_nganh?.trim() === idNganh) {
      ids.add(rid);
    }
  }

  return [...ids];
}

async function queryKhoiHeads(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
  opts: KhoiQueryOpts,
): Promise<RawKhoiHead[]> {
  let q = supabase
    .from("org_cau_hinh_khoi")
    .select(KHOI_HEAD_SELECT)
    .eq("id_to_chuc", orgId.trim());

  if (opts.schoolWide) {
    q = q.is("id_truong_nganh", null);
  } else if (opts.truongNganhIds?.length) {
    q = q.in("id_truong_nganh", opts.truongNganhIds);
  }

  if (typeof opts.nam === "number") {
    q = q.eq("nam_ap_dung", opts.nam);
  }
  if (typeof opts.namLte === "number") {
    q = q.lte("nam_ap_dung", opts.namLte);
  }

  const { data, error } = await q
    .order("nam_ap_dung", { ascending: false })
    .order("id", { ascending: true })
    .limit(opts.limit ?? 4);

  if (error || !data?.length) return [];
  return data as RawKhoiHead[];
}

async function pickBestConfig(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  heads: RawKhoiHead[],
): Promise<TruongCauHinhTinhDiem | null> {
  for (const head of heads) {
    const cfg = await buildFromKhoiHead(supabase, head);
    if (cfg?.mon.length) return cfg;
  }
  return null;
}

async function tryCalcConfigForOrg(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
  truongNganhId: string,
  nam: number,
  anchorOrgId?: string,
): Promise<TruongCauHinhTinhDiem | null> {
  const nganhIds = await expandTruongNganhIdsForCalc(
    supabase,
    orgId,
    truongNganhId,
    anchorOrgId ? { anchorOrgId } : undefined,
  );
  if (!nganhIds.length) return null;

  const perNganhLimit = Math.min(16, Math.max(4, nganhIds.length * 4));
  const steps: KhoiQueryOpts[] = [
    { truongNganhIds: nganhIds, nam, limit: perNganhLimit },
    { schoolWide: true, nam },
    { truongNganhIds: nganhIds, namLte: nam, limit: perNganhLimit },
    { schoolWide: true, namLte: nam },
  ];

  for (const step of steps) {
    const heads = await queryKhoiHeads(supabase, orgId, step);
    const cfg = await pickBestConfig(supabase, heads);
    if (cfg?.mon.length) return cfg;
  }
  return null;
}

/**
 * Lookup org_cau_hinh_khoi + org_cau_hinh_mon (4 bước fallback).
 * `truongNganhId` = org_truong_nganh.id trên UI.
 */
export async function getCalcConfig(
  orgId: string,
  truongNganhId: string,
  nam: number,
): Promise<TruongCauHinhTinhDiem | null> {
  if (!hasSupabaseEnv() || !orgId.trim() || !truongNganhId.trim()) return null;

  try {
    const supabase = createPublicSupabaseClient();
    const org = orgId.trim();
    const nganh = truongNganhId.trim();

    let cfg = await tryCalcConfigForOrg(supabase, org, nganh, nam);
    if (cfg?.mon.length) return cfg;

    const fallbackOrg = ORG_CAU_HINH_FALLBACK[org];
    if (fallbackOrg) {
      cfg = await tryCalcConfigForOrg(
        supabase,
        fallbackOrg,
        nganh,
        nam,
        org,
      );
      if (cfg?.mon.length) return cfg;
    }

    return null;
  } catch {
    return null;
  }
}

/** Alias — cùng logic getCalcConfig. */
export async function getCauHinhTinhDiemForTruongNganh(
  orgId: string,
  nam: number,
  truongNganhId: string,
): Promise<TruongCauHinhTinhDiem | null> {
  return getCalcConfig(orgId, truongNganhId, nam);
}

/** Đọc trực tiếp theo id khối (modal cấu hình / legacy PT). */
export async function getCauHinhTinhDiemByKhoiId(
  khoiId: string,
): Promise<TruongCauHinhTinhDiem | null> {
  if (!hasSupabaseEnv() || !khoiId.trim()) return null;

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("org_cau_hinh_khoi")
      .select(KHOI_HEAD_SELECT)
      .eq("id", khoiId.trim())
      .maybeSingle();

    if (error || !data) return null;
    return buildFromKhoiHead(supabase, data as RawKhoiHead);
  } catch {
    return null;
  }
}

async function schoolWideConfigForOrg(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
  nam: number,
): Promise<TruongCauHinhTinhDiem | null> {
  for (const step of [
    { schoolWide: true, nam } as KhoiQueryOpts,
    { schoolWide: true, namLte: nam } as KhoiQueryOpts,
  ]) {
    const heads = await queryKhoiHeads(supabase, orgId, step);
    const cfg = await pickBestConfig(supabase, heads);
    if (cfg?.mon.length) return cfg;
  }
  return null;
}

/** Khối đầu tiên có môn trong năm (per-ngành hoặc chung). */
async function firstKhoiConfigForOrgYear(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
  nam: number,
): Promise<TruongCauHinhTinhDiem | null> {
  const heads = await queryKhoiHeads(supabase, orgId, {
    namLte: nam,
    limit: 16,
  });
  return pickBestConfig(supabase, heads);
}

/** Khối chung trường (id_truong_nganh IS NULL) — sidebar / modal khi chưa chọn ngành. */
export async function getCauHinhTinhDiemSchoolWide(
  orgId: string,
  nam: number,
): Promise<TruongCauHinhTinhDiem | null> {
  if (!hasSupabaseEnv() || !orgId.trim()) return null;

  try {
    const supabase = createPublicSupabaseClient();
    const org = orgId.trim();
    let cfg = await schoolWideConfigForOrg(supabase, org, nam);
    if (cfg?.mon.length) return cfg;

    const fallbackOrg = ORG_CAU_HINH_FALLBACK[org];
    if (fallbackOrg) {
      cfg = await schoolWideConfigForOrg(supabase, fallbackOrg, nam);
      if (cfg?.mon.length) return cfg;
    }
    return null;
  } catch {
    return null;
  }
}

/** Bất kỳ khối có môn trong năm (modal admin khi PT chưa gắn id_cau_hinh_khoi). */
export async function getAnyCauHinhForOrgYear(
  orgId: string,
  nam: number,
): Promise<TruongCauHinhTinhDiem | null> {
  if (!hasSupabaseEnv() || !orgId.trim()) return null;

  try {
    const supabase = createPublicSupabaseClient();
    const org = orgId.trim();

    let cfg = await schoolWideConfigForOrg(supabase, org, nam);
    if (cfg?.mon.length) return cfg;

    cfg = await firstKhoiConfigForOrgYear(supabase, org, nam);
    if (cfg?.mon.length) return cfg;

    const fallbackOrg = ORG_CAU_HINH_FALLBACK[org];
    if (fallbackOrg) {
      cfg = await schoolWideConfigForOrg(supabase, fallbackOrg, nam);
      if (cfg?.mon.length) return cfg;
      cfg = await firstKhoiConfigForOrgYear(supabase, fallbackOrg, nam);
      if (cfg?.mon.length) return cfg;
    }
    return null;
  } catch {
    return null;
  }
}

export type TruongCauHinhKhoiListItem = { id: string; nam_ap_dung: number };

async function listCauHinhKhoiRowsForOrg(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  orgId: string,
  nam: number,
): Promise<TruongCauHinhKhoiListItem[]> {
  const { data, error } = await supabase
    .from("org_cau_hinh_khoi")
    .select("id, nam_ap_dung")
    .eq("id_to_chuc", orgId.trim())
    .lte("nam_ap_dung", nam)
    .order("nam_ap_dung", { ascending: false })
    .order("id", { ascending: true });

  if (error || !data) return [];
  return data
    .map((r) => {
      const row = r as { id?: string; nam_ap_dung?: number };
      if (!row.id) return null;
      return {
        id: row.id,
        nam_ap_dung:
          typeof row.nam_ap_dung === "number" ? row.nam_ap_dung : nam,
      };
    })
    .filter(Boolean) as TruongCauHinhKhoiListItem[];
}

export async function listCauHinhKhoiForOrg(
  orgId: string,
  nam: number,
): Promise<TruongCauHinhKhoiListItem[]> {
  if (!hasSupabaseEnv() || !orgId.trim()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const org = orgId.trim();
    const byId = new Map<string, TruongCauHinhKhoiListItem>();

    for (const row of await listCauHinhKhoiRowsForOrg(supabase, org, nam)) {
      byId.set(row.id, row);
    }

    const fallbackOrg = ORG_CAU_HINH_FALLBACK[org];
    if (fallbackOrg) {
      for (const row of await listCauHinhKhoiRowsForOrg(
        supabase,
        fallbackOrg,
        nam,
      )) {
        if (!byId.has(row.id)) byId.set(row.id, row);
      }
    }

    return [...byId.values()];
  } catch {
    return [];
  }
}

/** API route — ưu tiên theo ngành, không ép khối legacy từ phương thức. */
export async function resolveCauHinhTinhDiemApi(
  orgId: string,
  nam: number,
  opts: { truongNganhId?: string | null; khoiId?: string | null },
): Promise<TruongCauHinhTinhDiem | null> {
  const nganh = opts.truongNganhId?.trim();
  const khoi = opts.khoiId?.trim();

  if (nganh) {
    const cfg = await getCalcConfig(orgId, nganh, nam);
    if (cfg?.mon.length) return cfg;
  }

  if (khoi) {
    const cfg = await getCauHinhTinhDiemByKhoiId(khoi);
    if (cfg?.mon.length) return cfg;
  }

  if (!nganh && !khoi) {
    const cfg = await getAnyCauHinhForOrgYear(orgId, nam);
    if (cfg?.mon.length) return cfg;
  }

  return null;
}

/** Tương thích gọi cũ từ queries / modal. */
export async function getCauHinhTinhDiemForNganh(
  orgId: string,
  nam: number,
  truongNganhId?: string | null,
  explicitKhoiId?: string | null,
): Promise<TruongCauHinhTinhDiem | null> {
  return resolveCauHinhTinhDiemApi(orgId, nam, {
    truongNganhId,
    khoiId: explicitKhoiId,
  });
}

export async function getCauHinhTinhDiem(
  orgId: string,
  nam: number,
  khoiId?: string | null,
): Promise<TruongCauHinhTinhDiem | null> {
  return resolveCauHinhTinhDiemApi(orgId, nam, { khoiId });
}

export function cauHinhMonThiCacheKey(
  truongNganhId: string,
  year: number,
): string {
  return `${truongNganhId.trim()}:${year}`;
}

/** Tìm cấu hình trong cache SSR (cùng ngành, năm gần nhất nếu thiếu đúng năm). */
export function pickCauHinhFromCache(
  cache: Record<string, TruongCauHinhTinhDiem>,
  programId: string,
  year: number,
): { config: TruongCauHinhTinhDiem; sourceYear: number } | null {
  const pid = programId.trim();
  const exact = cache[cauHinhMonThiCacheKey(pid, year)];
  if (exact?.mon.length) return { config: exact, sourceYear: year };

  let best: TruongCauHinhTinhDiem | null = null;
  let bestYear = year;
  let bestDelta = Infinity;

  for (const [key, cfg] of Object.entries(cache)) {
    if (!cfg.mon.length) continue;
    const colon = key.lastIndexOf(":");
    if (colon < 0) continue;
    if (key.slice(0, colon) !== pid) continue;
    const y = Number(key.slice(colon + 1));
    if (Number.isNaN(y)) continue;
    const delta = Math.abs(y - year);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = cfg;
      bestYear = y;
    }
  }

  if (!best) return null;
  return { config: best, sourceYear: bestYear };
}

/** Cấu hình môn thi của năm gần nhất *trước* `year` (ưu tiên kế thừa khi thêm năm mới). */
export function pickPriorYearCauHinhFromCache(
  cache: Record<string, TruongCauHinhTinhDiem>,
  programId: string,
  year: number,
): TruongCauHinhTinhDiem | null {
  const pid = programId.trim();
  let best: TruongCauHinhTinhDiem | null = null;
  let bestYear = -1;

  for (const [key, cfg] of Object.entries(cache)) {
    if (!cfg.mon.length) continue;
    const colon = key.lastIndexOf(":");
    if (colon < 0) continue;
    if (key.slice(0, colon) !== pid) continue;
    const y = Number(key.slice(colon + 1));
    if (Number.isNaN(y) || y >= year) continue;
    if (y > bestYear) {
      bestYear = y;
      best = cfg;
    }
  }

  return best;
}

/** Bản nháp khi chưa có org_cau_hinh_khoi — chỉnh trên phiên, gắn đúng năm/ngành. */
export function cloneCauHinhForYear(
  base: TruongCauHinhTinhDiem,
  programId: string,
  year: number,
): TruongCauHinhTinhDiem {
  return {
    ...base,
    nam_ap_dung: year,
    id_truong_nganh: programId.trim(),
    mon: base.mon.map((m) => ({ ...m })),
  };
}

export function createEmptyCauHinhDraft(
  programId: string,
  year: number,
): TruongCauHinhTinhDiem {
  return {
    id: `draft-${programId.trim()}-${year}`,
    quy_ve_thang: 30,
    diem_san_xet_tuyen: null,
    co_diem_uu_tien: false,
    co_diem_thuong: false,
    nam_ap_dung: year,
    id_truong_nganh: programId.trim(),
    khoiThi: null,
    mon: [],
  };
}

/** Các năm có org_cau_hinh_khoi cho trường. */
export async function listCauHinhYearsForOrg(orgId: string): Promise<number[]> {
  if (!hasSupabaseEnv() || !orgId.trim()) return [];
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("org_cau_hinh_khoi")
      .select("nam_ap_dung")
      .eq("id_to_chuc", orgId.trim());

    if (error || !data?.length) return [];

    const years = new Set<number>();
    for (const row of data) {
      const y = (row as { nam_ap_dung?: number }).nam_ap_dung;
      if (typeof y === "number" && y > 0) years.add(y);
    }
    return [...years].sort((a, b) => b - a);
  } catch {
    return [];
  }
}

/** Tải sẵn cấu hình môn thi trên server (tránh client API/RLS). */
export async function prefetchCauHinhMonThiByKey(
  orgId: string,
  programIds: string[],
  years: number[],
): Promise<Record<string, TruongCauHinhTinhDiem>> {
  const out: Record<string, TruongCauHinhTinhDiem> = {};
  if (!programIds.length || !years.length) return out;

  await Promise.all(
    programIds.flatMap((pid) =>
      years.map(async (year) => {
        const cfg = await getCalcConfig(orgId, pid, year);
        if (cfg?.mon.length) {
          out[cauHinhMonThiCacheKey(pid, year)] = cfg;
        }
      }),
    ),
  );

  return out;
}
