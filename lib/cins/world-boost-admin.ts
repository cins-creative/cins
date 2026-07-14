import "server-only";

import { journeyImageFields } from "@/lib/journey/images";
import { loadVerifiedCotMocIdSet } from "@/lib/journey/milestone-verify";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import type { GalleryMediaKind } from "@/lib/journey/post-block-helpers";
import { galleryMediaKindFromBlocks } from "@/lib/journey/post-media";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import {
  parseWorldBoostLoai,
  renewExpiredWorldBoosts,
  worldBoostKey,
  type WorldBoostLoai,
} from "@/lib/cins/world-boost";
import type {
  WorldBoostCatalogItem,
  WorldBoostCatalogNguon,
  WorldBoostDinhDangFilter,
  WorldBoostGrowth,
  WorldBoostGrowthDays,
  WorldBoostGrowthPoint,
  WorldBoostGrowthTotals,
  WorldBoostStats,
  WorldBoostXacThucFilter,
} from "@/lib/cins/world-boost-types";

export type {
  WorldBoostCatalogItem,
  WorldBoostCatalogNguon,
  WorldBoostDinhDangFilter,
  WorldBoostGrowth,
  WorldBoostGrowthDays,
  WorldBoostGrowthPoint,
  WorldBoostGrowthTotals,
  WorldBoostStats,
  WorldBoostXacThucFilter,
} from "@/lib/cins/world-boost-types";

export type WorldBoostListFilters = {
  nguon?: WorldBoostCatalogNguon | "all";
  dinhDang?: WorldBoostDinhDangFilter;
  xacThuc?: WorldBoostXacThucFilter;
  chiDangBoost?: boolean;
  q?: string;
  offset?: number;
  limit?: number;
};

const DINH_DANG_LABEL: Record<GalleryMediaKind, string> = {
  article: "Bài viết",
  photo: "Album ảnh",
  video: "Video",
  embed: "File nhúng",
};

const LOAI_LABEL: Record<WorldBoostLoai, string> = {
  cot_moc: "Cột mốc / bài user",
  org_bai_dang: "Bài đăng tổ chức",
  org_su_kien: "Sự kiện tổ chức",
};

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const VN_TZ = "Asia/Ho_Chi_Minh";

function dateKeyVn(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Danh sách YYYY-MM-DD liên tiếp, kết thúc = hôm nay (VN). */
function lastNDateKeysVn(days: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    keys.push(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: VN_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d),
    );
  }
  return keys;
}

function emptyTotals(): WorldBoostGrowthTotals {
  return { cotMoc: 0, orgBaiDang: 0, suKien: 0, total: 0 };
}

function sumSeries(
  series: WorldBoostGrowthPoint[],
): WorldBoostGrowthTotals {
  const t = emptyTotals();
  for (const p of series) {
    t.cotMoc += p.cotMoc;
    t.orgBaiDang += p.orgBaiDang;
    t.suKien += p.suKien;
    t.total += p.total;
  }
  return t;
}

type TaoLucRow = { tao_luc: string };

async function fetchAllTaoLuc(
  buildPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: TaoLucRow[] | null; error: { message: string } | null }>,
): Promise<string[]> {
  const pageSize = 1000;
  const times: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const row of rows) {
      if (row.tao_luc) times.push(row.tao_luc);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
    if (from > 50_000) break;
  }
  return times;
}

function countByDay(times: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const iso of times) {
    const key = dateKeyVn(iso);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export async function fetchWorldBoostGrowth(
  daysInput: number = 30,
): Promise<WorldBoostGrowth> {
  const days: WorldBoostGrowthDays = daysInput <= 7 ? 7 : 30;
  const admin = createServiceRoleClient();
  /* Hai cửa sổ liền kề: hiện tại `days` ngày + cửa sổ trước cùng độ dài */
  const sinceIso = daysAgoIso(days * 2);

  const [cotTimes, orgTimes, suKienTimes] = await Promise.all([
    fetchAllTaoLuc((from, to) =>
      admin
        .from("content_cot_moc")
        .select("tao_luc")
        .in("che_do_hien_thi", ["feature", "public"])
        .gte("tao_luc", sinceIso)
        .order("tao_luc", { ascending: true })
        .range(from, to)
        .returns<TaoLucRow[]>(),
    ),
    fetchAllTaoLuc((from, to) =>
      admin
        .from("org_bai_dang")
        .select("tao_luc")
        .eq("trang_thai", "da_dang")
        .gte("tao_luc", sinceIso)
        .order("tao_luc", { ascending: true })
        .range(from, to)
        .returns<TaoLucRow[]>(),
    ),
    fetchAllTaoLuc((from, to) =>
      admin
        .from("org_su_kien")
        .select("tao_luc")
        .gte("tao_luc", sinceIso)
        .order("tao_luc", { ascending: true })
        .range(from, to)
        .returns<TaoLucRow[]>(),
    ),
  ]);

  const cotByDay = countByDay(cotTimes);
  const orgByDay = countByDay(orgTimes);
  const suKienByDay = countByDay(suKienTimes);

  const windowKeys = lastNDateKeysVn(days * 2);
  const prevKeys = windowKeys.slice(0, days);
  const currentKeys = windowKeys.slice(days);

  const buildSeries = (keys: string[]): WorldBoostGrowthPoint[] =>
    keys.map((date) => {
      const cotMoc = cotByDay.get(date) ?? 0;
      const orgBaiDang = orgByDay.get(date) ?? 0;
      const suKien = suKienByDay.get(date) ?? 0;
      return {
        date,
        cotMoc,
        orgBaiDang,
        suKien,
        total: cotMoc + orgBaiDang + suKien,
      };
    });

  const series = buildSeries(currentKeys);
  const prevSeries = buildSeries(prevKeys);

  return {
    days,
    series,
    totals: sumSeries(series),
    prevTotals: sumSeries(prevSeries),
  };
}

export async function fetchWorldBoostStats(): Promise<WorldBoostStats> {
  await renewExpiredWorldBoosts();
  const admin = createServiceRoleClient();
  const since7 = daysAgoIso(7);
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  const [boostActive, boostSoon, cotMoc, orgBai, suKien] = await Promise.all([
    admin
      .from("content_world_boost")
      .select("id", { count: "exact", head: true })
      .eq("dang_bat", true),
    admin
      .from("content_world_boost")
      .select("id", { count: "exact", head: true })
      .eq("dang_bat", true)
      .gte("het_han_luc", nowIso)
      .lte("het_han_luc", in24h),
    admin
      .from("content_cot_moc")
      .select("id", { count: "exact", head: true })
      .in("che_do_hien_thi", ["feature", "public"])
      .gte("tao_luc", since7),
    admin
      .from("org_bai_dang")
      .select("id", { count: "exact", head: true })
      .eq("trang_thai", "da_dang")
      .gte("tao_luc", since7),
    admin
      .from("org_su_kien")
      .select("id", { count: "exact", head: true })
      .gte("tao_luc", since7),
  ]);

  return {
    dangBoost: boostActive.count ?? 0,
    sapHetHan24h: boostSoon.count ?? 0,
    cotMocMoi7n: cotMoc.count ?? 0,
    orgBaiDangMoi7n: orgBai.count ?? 0,
    suKienMoi7n: suKien.count ?? 0,
  };
}

type BoostMapRow = {
  loai_doi_tuong: WorldBoostLoai;
  id_doi_tuong: string;
  dang_bat: boolean;
  het_han_luc: string;
};

async function loadBoostMap(): Promise<Map<string, BoostMapRow>> {
  await renewExpiredWorldBoosts();
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_world_boost")
    .select("loai_doi_tuong, id_doi_tuong, dang_bat, het_han_luc")
    .eq("dang_bat", true)
    .limit(500)
    .returns<BoostMapRow[]>();

  const map = new Map<string, BoostMapRow>();
  for (const row of data ?? []) {
    map.set(worldBoostKey(row.loai_doi_tuong, row.id_doi_tuong), row);
  }
  return map;
}

function thumbFromCover(coverId: string | null | undefined): string | null {
  if (!coverId) return null;
  return journeyImageFields(coverId, "gallery-grid")?.src ?? null;
}

function kindMeta(kind: GalleryMediaKind): {
  dinhDang: GalleryMediaKind;
  dinhDangLabel: string;
} {
  return { dinhDang: kind, dinhDangLabel: DINH_DANG_LABEL[kind] };
}

export async function listWorldBoostCatalog(
  filters: WorldBoostListFilters = {},
): Promise<{ items: WorldBoostCatalogItem[]; hasMore: boolean; totalApprox: number }> {
  const offset = Math.max(0, filters.offset ?? 0);
  const limit = Math.min(Math.max(1, filters.limit ?? 48), 96);
  const nguon = filters.nguon ?? "all";
  const dinhDang = filters.dinhDang ?? "all";
  const xacThuc = filters.xacThuc ?? "all";
  const chiDangBoost = Boolean(filters.chiDangBoost);
  const q = filters.q?.trim().toLowerCase() ?? "";

  const boostMap = await loadBoostMap();
  const admin = createServiceRoleClient();
  const poolLimit = Math.min(240, offset + limit + 80);

  type RawItem = Omit<WorldBoostCatalogItem, "dangBoost" | "hetHanLuc" | "key">;

  const raw: RawItem[] = [];

  const wantCot = nguon === "all" || nguon === "user";
  const wantOrgBai = nguon === "all" || nguon === "org";
  const wantSuKien = nguon === "all" || nguon === "org";

  if (wantCot) {
    const { data: rows } = await admin
      .from("content_cot_moc")
      .select("id, tieu_de, mo_ta, tao_luc, id_nguoi_dung, che_do_hien_thi")
      .in("che_do_hien_thi", ["feature", "public"])
      .order("tao_luc", { ascending: false })
      .limit(poolLimit)
      .returns<
        Array<{
          id: string;
          tieu_de: string | null;
          mo_ta: string | null;
          tao_luc: string;
          id_nguoi_dung: string;
          che_do_hien_thi: string;
        }>
      >();

    const userIds = [...new Set((rows ?? []).map((r) => r.id_nguoi_dung))];
    const { data: users } = userIds.length
      ? await admin
          .from("user_nguoi_dung")
          .select("id, slug, ten_hien_thi, avatar_id")
          .in("id", userIds)
          .returns<
            Array<{
              id: string;
              slug: string;
              ten_hien_thi: string | null;
              avatar_id: string | null;
            }>
          >()
      : {
          data: [] as Array<{
            id: string;
            slug: string;
            ten_hien_thi: string | null;
            avatar_id: string | null;
          }>,
        };

    const userMap = new Map((users ?? []).map((u) => [u.id, u]));

    const cotIds = (rows ?? []).map((r) => r.id);
    const [{ data: covers }, verifiedIds] = await Promise.all([
      cotIds.length
        ? admin
            .from("content_tac_pham_thuoc_moc")
            .select(
              "id_cot_moc, content_tac_pham:content_tac_pham(cover_id, noi_dung_blocks)",
            )
            .in("id_cot_moc", cotIds)
            .limit(poolLimit)
            .returns<
              Array<{
                id_cot_moc: string;
                content_tac_pham:
                  | { cover_id: string | null; noi_dung_blocks: unknown }
                  | { cover_id: string | null; noi_dung_blocks: unknown }[]
                  | null;
              }>
            >()
        : Promise.resolve({
            data: [] as Array<{
              id_cot_moc: string;
              content_tac_pham:
                | { cover_id: string | null; noi_dung_blocks: unknown }
                | { cover_id: string | null; noi_dung_blocks: unknown }[]
                | null;
            }>,
          }),
      loadVerifiedCotMocIdSet(cotIds),
    ]);

    const coverByCot = new Map<string, string | null>();
    const kindByCot = new Map<string, GalleryMediaKind>();
    for (const c of covers ?? []) {
      const tp = Array.isArray(c.content_tac_pham)
        ? c.content_tac_pham[0]
        : c.content_tac_pham;
      if (!coverByCot.has(c.id_cot_moc)) {
        coverByCot.set(c.id_cot_moc, tp?.cover_id ?? null);
        kindByCot.set(
          c.id_cot_moc,
          galleryMediaKindFromBlocks(parseServerBlocks(tp?.noi_dung_blocks)),
        );
      }
    }

    for (const r of rows ?? []) {
      const u = userMap.get(r.id_nguoi_dung);
      const kind = kindByCot.get(r.id) ?? "article";
      raw.push({
        loai: "cot_moc",
        id: r.id,
        tieuDe: r.tieu_de?.trim() || "(Không tiêu đề)",
        moTa: r.mo_ta,
        thumbUrl: thumbFromCover(coverByCot.get(r.id) ?? null),
        nguon: "user",
        loaiLabel:
          r.che_do_hien_thi === "feature"
            ? `${LOAI_LABEL.cot_moc} · Nổi bật`
            : LOAI_LABEL.cot_moc,
        ...kindMeta(kind),
        daXacThuc: verifiedIds.has(r.id),
        tacGiaTen: u?.ten_hien_thi ?? u?.slug ?? null,
        tacGiaSlug: u?.slug ?? null,
        taoLuc: r.tao_luc,
      });
    }
  }

  if (wantOrgBai) {
    const { data: rows } = await admin
      .from("org_bai_dang")
      .select(
        "id, tieu_de, tom_tat, cover_id, tao_luc, id_to_chuc, loai_bai_dang, noi_dung_blocks, org_to_chuc:org_to_chuc(slug, ten)",
      )
      .eq("trang_thai", "da_dang")
      .order("tao_luc", { ascending: false })
      .limit(poolLimit)
      .returns<
        Array<{
          id: string;
          tieu_de: string | null;
          tom_tat: string | null;
          cover_id: string | null;
          tao_luc: string;
          id_to_chuc: string;
          loai_bai_dang: string | null;
          noi_dung_blocks: unknown;
          org_to_chuc:
            | { slug: string | null; ten: string | null }
            | { slug: string | null; ten: string | null }[]
            | null;
        }>
      >();

    for (const r of rows ?? []) {
      const org = Array.isArray(r.org_to_chuc)
        ? r.org_to_chuc[0]
        : r.org_to_chuc;
      const kind = galleryMediaKindFromBlocks(
        parseBaiDangBlocks(r.noi_dung_blocks),
      );
      raw.push({
        loai: "org_bai_dang",
        id: r.id,
        tieuDe: r.tieu_de?.trim() || "(Không tiêu đề)",
        moTa: r.tom_tat,
        thumbUrl: thumbFromCover(r.cover_id),
        nguon: "org",
        loaiLabel: r.loai_bai_dang
          ? `${LOAI_LABEL.org_bai_dang} · ${r.loai_bai_dang}`
          : LOAI_LABEL.org_bai_dang,
        ...kindMeta(kind),
        daXacThuc: false,
        tacGiaTen: org?.ten ?? org?.slug ?? null,
        tacGiaSlug: org?.slug ?? null,
        taoLuc: r.tao_luc,
      });
    }
  }

  if (wantSuKien) {
    const { data: rows } = await admin
      .from("org_su_kien")
      .select(
        "id, ten, mo_ta, cover_id, tao_luc, id_to_chuc, org_to_chuc:org_to_chuc(slug, ten)",
      )
      .order("tao_luc", { ascending: false })
      .limit(Math.min(80, poolLimit))
      .returns<
        Array<{
          id: string;
          ten: string | null;
          mo_ta: string | null;
          cover_id: string | null;
          tao_luc: string;
          id_to_chuc: string;
          org_to_chuc:
            | { slug: string | null; ten: string | null }
            | { slug: string | null; ten: string | null }[]
            | null;
        }>
      >();

    for (const r of rows ?? []) {
      const org = Array.isArray(r.org_to_chuc)
        ? r.org_to_chuc[0]
        : r.org_to_chuc;
      raw.push({
        loai: "org_su_kien",
        id: r.id,
        tieuDe: r.ten?.trim() || "(Không tiêu đề)",
        moTa: r.mo_ta,
        thumbUrl: thumbFromCover(r.cover_id),
        nguon: "org",
        loaiLabel: LOAI_LABEL.org_su_kien,
        ...kindMeta("article"),
        daXacThuc: false,
        tacGiaTen: org?.ten ?? org?.slug ?? null,
        tacGiaSlug: org?.slug ?? null,
        taoLuc: r.tao_luc,
      });
    }
  }

  let items: WorldBoostCatalogItem[] = raw.map((item) => {
    const key = worldBoostKey(item.loai, item.id);
    const boost = boostMap.get(key);
    return {
      ...item,
      key,
      dangBoost: Boolean(boost),
      hetHanLuc: boost?.het_han_luc ?? null,
    };
  });

  if (chiDangBoost) {
    items = items.filter((i) => i.dangBoost);
  }

  if (dinhDang !== "all") {
    items = items.filter((i) => i.dinhDang === dinhDang);
  }

  if (xacThuc === "verified") {
    items = items.filter((i) => i.daXacThuc);
  } else if (xacThuc === "unverified") {
    items = items.filter((i) => !i.daXacThuc);
  }

  if (q) {
    items = items.filter((i) => {
      const hay =
        `${i.tieuDe} ${i.moTa ?? ""} ${i.tacGiaTen ?? ""} ${i.loaiLabel} ${i.dinhDangLabel}`.toLowerCase();
      return hay.includes(q);
    });
  }

  items.sort((a, b) => {
    if (a.dangBoost !== b.dangBoost) return a.dangBoost ? -1 : 1;
    if (a.daXacThuc !== b.daXacThuc) return a.daXacThuc ? -1 : 1;
    return a.taoLuc > b.taoLuc ? -1 : a.taoLuc < b.taoLuc ? 1 : 0;
  });

  const sliced = items.slice(offset, offset + limit);
  return {
    items: sliced,
    hasMore: offset + limit < items.length,
    totalApprox: items.length,
  };
}

export function assertWorldBoostLoai(raw: string): WorldBoostLoai | null {
  return parseWorldBoostLoai(raw);
}
