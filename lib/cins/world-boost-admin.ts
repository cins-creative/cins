import "server-only";

import { loadFeedScoreConfig } from "@/lib/cins/feed-scoring-config-db";
import { tinhDiemHienTai } from "@/lib/cins/feed-scoring";
import type { Block } from "@/lib/editor/types";
import { journeyImageFields } from "@/lib/journey/images";
import { loadVerifiedCotMocIdSet } from "@/lib/journey/milestone-verify";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import type { GalleryMediaKind } from "@/lib/journey/post-block-helpers";
import { extractAllImageIds } from "@/lib/journey/post-block-helpers";
import { galleryMediaKindFromBlocks } from "@/lib/journey/post-media";
import { orgPostHref, userPostHref } from "@/lib/search/helpers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { orgSuKienHref } from "@/lib/to-chuc/su-kien-routes";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import {
  parseWorldBoostLoai,
  renewExpiredWorldBoosts,
  worldBoostKey,
  type WorldBoostLoai,
} from "@/lib/cins/world-boost";
import { healOrphanBoostDiemFeedScores } from "@/lib/cins/feed-scoring-write";
import type {
  WorldBoostCatalogItem,
  WorldBoostCatalogNguon,
  WorldBoostDiemFeedSnapshot,
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

async function fetchAllTimestamps(
  buildPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: Array<Record<string, string | null>> | null;
    error: { message: string } | null;
  }>,
  column: string,
): Promise<string[]> {
  const pageSize = 1000;
  const times: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const row of rows) {
      const v = row[column];
      if (typeof v === "string" && v.trim()) times.push(v);
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

function sumTotalForKeys(
  cotByDay: Map<string, number>,
  orgByDay: Map<string, number>,
  suKienByDay: Map<string, number>,
  keys: string[],
): number {
  let n = 0;
  for (const k of keys) {
    n +=
      (cotByDay.get(k) ?? 0) +
      (orgByDay.get(k) ?? 0) +
      (suKienByDay.get(k) ?? 0);
  }
  return n;
}

export async function fetchWorldBoostGrowth(
  daysInput: number = 30,
): Promise<WorldBoostGrowth> {
  const days: WorldBoostGrowthDays = daysInput <= 7 ? 7 : 30;
  const admin = createServiceRoleClient();
  /* Cần ≥30 ngày cho last30; hai cửa sổ liền kề cho so sánh kỳ. */
  const sinceIso = daysAgoIso(Math.max(60, days * 2));

  /* org_su_kien không có tao_luc — dùng bat_dau (ngày sự kiện) làm proxy. */
  const [cotTimes, orgTimes, suKienTimes] = await Promise.all([
    fetchAllTimestamps(
      (from, to) =>
        admin
          .from("content_cot_moc")
          .select("tao_luc")
          .in("che_do_hien_thi", ["feature", "public"])
          .gte("tao_luc", sinceIso)
          .order("tao_luc", { ascending: true })
          .range(from, to),
      "tao_luc",
    ),
    fetchAllTimestamps(
      (from, to) =>
        admin
          .from("org_bai_dang")
          .select("tao_luc")
          .eq("trang_thai", "da_dang")
          .gte("tao_luc", sinceIso)
          .order("tao_luc", { ascending: true })
          .range(from, to),
      "tao_luc",
    ),
    fetchAllTimestamps(
      (from, to) =>
        admin
          .from("org_su_kien")
          .select("bat_dau")
          .gte("bat_dau", sinceIso)
          .order("bat_dau", { ascending: true })
          .range(from, to),
      "bat_dau",
    ),
  ]);

  const cotByDay = countByDay(cotTimes);
  const orgByDay = countByDay(orgTimes);
  const suKienByDay = countByDay(suKienTimes);

  const windowKeys = lastNDateKeysVn(days * 2);
  const prevKeys = windowKeys.slice(0, days);
  const currentKeys = windowKeys.slice(days);
  const keys30 = lastNDateKeysVn(30);
  const keys7 = lastNDateKeysVn(7);
  const todayKey =
    keys7[keys7.length - 1] ?? dateKeyVn(new Date().toISOString());

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
    today: sumTotalForKeys(cotByDay, orgByDay, suKienByDay, [todayKey]),
    last7: sumTotalForKeys(cotByDay, orgByDay, suKienByDay, keys7),
    last30: sumTotalForKeys(cotByDay, orgByDay, suKienByDay, keys30),
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
      .gte("bat_dau", since7),
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

/** Cover trước; không có thì ảnh đầu album trong blocks. */
function thumbFromCoverOrBlocks(
  coverId: string | null | undefined,
  blocks?: ReadonlyArray<Block> | null,
): string | null {
  const fromCover = thumbFromCover(coverId);
  if (fromCover) return fromCover;
  const firstAlbumId = extractAllImageIds(blocks)[0];
  if (!firstAlbumId) return null;
  return journeyImageFields(firstAlbumId, "gallery-grid")?.src ?? null;
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
  /* Sửa điểm còn kẹt mức đẩy dù boost đã tắt (click nhầm / race). */
  await healOrphanBoostDiemFeedScores().catch(() => 0);
  const admin = createServiceRoleClient();
  const poolLimit = Math.min(240, offset + limit + 80);

  type RawItem = Omit<
    WorldBoostCatalogItem,
    "dangBoost" | "hetHanLuc" | "key" | "diemFeed" | "moBaiUrl"
  > & { moBaiUrl?: string | null };

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
              "id_cot_moc, content_tac_pham:content_tac_pham(cover_id, noi_dung_blocks, slug)",
            )
            .in("id_cot_moc", cotIds)
            .limit(poolLimit)
            .returns<
              Array<{
                id_cot_moc: string;
                content_tac_pham:
                  | {
                      cover_id: string | null;
                      noi_dung_blocks: unknown;
                      slug: string | null;
                    }
                  | {
                      cover_id: string | null;
                      noi_dung_blocks: unknown;
                      slug: string | null;
                    }[]
                  | null;
              }>
            >()
        : Promise.resolve({
            data: [] as Array<{
              id_cot_moc: string;
              content_tac_pham:
                | {
                    cover_id: string | null;
                    noi_dung_blocks: unknown;
                    slug: string | null;
                  }
                | {
                    cover_id: string | null;
                    noi_dung_blocks: unknown;
                    slug: string | null;
                  }[]
                | null;
            }>,
          }),
      loadVerifiedCotMocIdSet(cotIds),
    ]);

    const coverByCot = new Map<string, string | null>();
    const blocksByCot = new Map<string, Block[] | null>();
    const kindByCot = new Map<string, GalleryMediaKind>();
    const postSlugByCot = new Map<string, string | null>();
    for (const c of covers ?? []) {
      const tp = Array.isArray(c.content_tac_pham)
        ? c.content_tac_pham[0]
        : c.content_tac_pham;
      if (!coverByCot.has(c.id_cot_moc)) {
        const blocks = parseServerBlocks(tp?.noi_dung_blocks);
        coverByCot.set(c.id_cot_moc, tp?.cover_id ?? null);
        blocksByCot.set(c.id_cot_moc, blocks);
        kindByCot.set(c.id_cot_moc, galleryMediaKindFromBlocks(blocks));
        postSlugByCot.set(c.id_cot_moc, tp?.slug?.trim() || null);
      }
    }

    for (const r of rows ?? []) {
      const u = userMap.get(r.id_nguoi_dung);
      const kind = kindByCot.get(r.id) ?? "article";
      const ownerSlug = u?.slug ?? null;
      const postSlug = postSlugByCot.get(r.id) ?? null;
      raw.push({
        loai: "cot_moc",
        id: r.id,
        tieuDe: r.tieu_de?.trim() || "(Không tiêu đề)",
        moTa: r.mo_ta,
        thumbUrl: thumbFromCoverOrBlocks(
          coverByCot.get(r.id) ?? null,
          blocksByCot.get(r.id),
        ),
        nguon: "user",
        loaiLabel:
          r.che_do_hien_thi === "feature"
            ? `${LOAI_LABEL.cot_moc} · Nổi bật`
            : LOAI_LABEL.cot_moc,
        ...kindMeta(kind),
        daXacThuc: verifiedIds.has(r.id),
        tacGiaTen: u?.ten_hien_thi ?? u?.slug ?? null,
        tacGiaSlug: ownerSlug,
        moBaiUrl:
          ownerSlug && postSlug ? userPostHref(ownerSlug, postSlug) : null,
        taoLuc: r.tao_luc,
      });
    }
  }

  if (wantOrgBai) {
    const { data: rows } = await admin
      .from("org_bai_dang")
      .select(
        "id, tieu_de, tom_tat, cover_id, tao_luc, id_to_chuc, loai_bai_dang, noi_dung_blocks, org_to_chuc:org_to_chuc(slug, ten, loai_to_chuc)",
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
            | {
                slug: string | null;
                ten: string | null;
                loai_to_chuc: string | null;
              }
            | {
                slug: string | null;
                ten: string | null;
                loai_to_chuc: string | null;
              }[]
            | null;
        }>
      >();

    for (const r of rows ?? []) {
      const org = Array.isArray(r.org_to_chuc)
        ? r.org_to_chuc[0]
        : r.org_to_chuc;
      const blocks = parseBaiDangBlocks(r.noi_dung_blocks);
      const kind = galleryMediaKindFromBlocks(blocks);
      const orgSlug = org?.slug?.trim() || null;
      raw.push({
        loai: "org_bai_dang",
        id: r.id,
        tieuDe: r.tieu_de?.trim() || "(Không tiêu đề)",
        moTa: r.tom_tat,
        thumbUrl: thumbFromCoverOrBlocks(r.cover_id, blocks),
        nguon: "org",
        loaiLabel: r.loai_bai_dang
          ? `${LOAI_LABEL.org_bai_dang} · ${r.loai_bai_dang}`
          : LOAI_LABEL.org_bai_dang,
        ...kindMeta(kind),
        daXacThuc: false,
        tacGiaTen: org?.ten ?? org?.slug ?? null,
        tacGiaSlug: orgSlug,
        moBaiUrl:
          orgSlug && org?.loai_to_chuc
            ? orgPostHref(org.loai_to_chuc, orgSlug, r.id)
            : null,
        taoLuc: r.tao_luc,
      });
    }
  }

  if (wantSuKien) {
    const { data: rows } = await admin
      .from("org_su_kien")
      .select(
        "id, ten, mo_ta, cover_id, bat_dau, id_to_chuc, org_to_chuc:org_to_chuc(slug, ten, loai_to_chuc)",
      )
      .order("bat_dau", { ascending: false })
      .limit(Math.min(80, poolLimit))
      .returns<
        Array<{
          id: string;
          ten: string | null;
          mo_ta: string | null;
          cover_id: string | null;
          bat_dau: string;
          id_to_chuc: string;
          org_to_chuc:
            | {
                slug: string | null;
                ten: string | null;
                loai_to_chuc: string | null;
              }
            | {
                slug: string | null;
                ten: string | null;
                loai_to_chuc: string | null;
              }[]
            | null;
        }>
      >();

    for (const r of rows ?? []) {
      const org = Array.isArray(r.org_to_chuc)
        ? r.org_to_chuc[0]
        : r.org_to_chuc;
      const orgSlug = org?.slug?.trim() || null;
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
        tacGiaSlug: orgSlug,
        moBaiUrl:
          orgSlug && org?.loai_to_chuc
            ? orgSuKienHref(org.loai_to_chuc, orgSlug)
            : null,
        /* Không có tao_luc — dùng bat_dau cho sort / hiển thị ngày. */
        taoLuc: r.bat_dau,
      });
    }
  }

  let items: WorldBoostCatalogItem[] = raw.map((item) => {
    const key = worldBoostKey(item.loai, item.id);
    const boost = boostMap.get(key);
    return {
      ...item,
      key,
      moBaiUrl: item.moBaiUrl ?? null,
      dangBoost: Boolean(boost),
      hetHanLuc: boost?.het_han_luc ?? null,
      diemFeed: null,
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

  items = await attachDiemFeedSnapshots(items);

  const scoreCfg = await loadFeedScoreConfig();
  const nowMs = Date.now();
  const scoreOf = (item: WorldBoostCatalogItem): number =>
    item.diemFeed ? tinhDiemHienTai(item.diemFeed, nowMs, scoreCfg) : 0;

  /* Chỉ giữ bài còn điểm > 0 (decay 7 ngày về 0 — không còn xếp Timeline). */
  items = items.filter((i) => scoreOf(i) > 0);

  items.sort((a, b) => {
    const diff = scoreOf(b) - scoreOf(a);
    if (diff !== 0) return diff;
    return a.taoLuc > b.taoLuc ? -1 : a.taoLuc < b.taoLuc ? 1 : 0;
  });

  const sliced = items.slice(offset, offset + limit);
  return {
    items: sliced,
    hasMore: offset + limit < items.length,
    totalApprox: items.length,
  };
}

type DiemFeedRow = WorldBoostDiemFeedSnapshot & {
  loai_doi_tuong: "cot_moc" | "org_bai_dang";
  id_doi_tuong: string;
};

async function attachDiemFeedSnapshots(
  items: WorldBoostCatalogItem[],
): Promise<WorldBoostCatalogItem[]> {
  if (items.length === 0) return items;

  const cotIds = [
    ...new Set(items.filter((i) => i.loai === "cot_moc").map((i) => i.id)),
  ];
  const orgIds = [
    ...new Set(
      items.filter((i) => i.loai === "org_bai_dang").map((i) => i.id),
    ),
  ];
  if (cotIds.length === 0 && orgIds.length === 0) return items;

  const admin = createServiceRoleClient();
  const map = new Map<string, WorldBoostDiemFeedSnapshot>();

  async function loadLoai(
    loai: "cot_moc" | "org_bai_dang",
    ids: string[],
  ) {
    if (ids.length === 0) return;
    const chunkSize = 80;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const slice = ids.slice(i, i + chunkSize);
      const { data } = await admin
        .from("content_diem_feed")
        .select(
          "loai_doi_tuong, id_doi_tuong, diem_co_ban, diem_noi_dung, diem_verify, diem_engagement, diem_uu_tien, bat_dau_luc",
        )
        .eq("loai_doi_tuong", loai)
        .in("id_doi_tuong", slice)
        .returns<DiemFeedRow[]>();
      for (const row of data ?? []) {
        map.set(worldBoostKey(row.loai_doi_tuong, row.id_doi_tuong), {
          diem_co_ban: row.diem_co_ban,
          diem_noi_dung: row.diem_noi_dung,
          diem_verify: row.diem_verify,
          diem_engagement: row.diem_engagement,
          diem_uu_tien: row.diem_uu_tien ?? 0,
          bat_dau_luc: row.bat_dau_luc,
        });
      }
    }
  }

  await Promise.all([loadLoai("cot_moc", cotIds), loadLoai("org_bai_dang", orgIds)]);

  return items.map((item) => {
    if (item.loai !== "cot_moc" && item.loai !== "org_bai_dang") {
      return item;
    }
    return {
      ...item,
      diemFeed: map.get(item.key) ?? null,
    };
  });
}

export function assertWorldBoostLoai(raw: string): WorldBoostLoai | null {
  return parseWorldBoostLoai(raw);
}
