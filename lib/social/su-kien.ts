import "server-only";

import { createHash } from "node:crypto";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  INSIGHT_ROLLUP_TOI_DA_THANG,
  MAX_SU_KIEN_BATCH,
  kAnonCount,
  sanitizeSuKien,
  type SuKienInput,
} from "@/lib/social/su-kien-constants";
import { dropOwnerSelfEvents } from "@/lib/social/su-kien-validate";

/** Hash phien_id của khách (không lưu giá trị thô — tránh PII/định danh ngược). */
export function hashPhienId(phienId: string | null | undefined): string | null {
  const raw = phienId?.trim();
  if (!raw) return null;
  const salt =
    process.env.SU_KIEN_SALT?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "cins-su-kien";
  return createHash("sha256").update(`${salt}:${raw}`).digest("hex").slice(0, 32);
}

type RecordContext = {
  /** UUID người xem (đăng nhập) — null nếu khách. */
  nguoiXemId: string | null;
  /** phien_id thô từ client (sẽ hash). */
  phienIdRaw?: string | null;
};

/**
 * Ghi batch event vào `social_luot_xem` (qua service role).
 * Bỏ qua event không hợp lệ; trả số dòng đã ghi.
 */
export async function recordSuKien(
  rawEvents: unknown,
  ctx: RecordContext,
): Promise<{ ok: true; written: number } | { ok: false; error: string }> {
  if (!Array.isArray(rawEvents)) {
    return { ok: false, error: "events phải là mảng." };
  }
  const phienHash = hashPhienId(ctx.phienIdRaw);

  const sanitized: SuKienInput[] = [];
  for (const raw of rawEvents.slice(0, MAX_SU_KIEN_BATCH)) {
    const ev = sanitizeSuKien(raw);
    if (!ev) continue;
    if ((ev.loai_doi_tuong as string) === "chat_tin_nhan") continue;
    sanitized.push(ev);
  }
  const kept = await dropOwnerSelfEvents(sanitized, ctx.nguoiXemId);
  const deduped = dedupSuKienBatch(kept);

  const rows = deduped.map((ev) => toRow(ev, ctx.nguoiXemId, phienHash));

  if (rows.length === 0) return { ok: true, written: 0 };

  const admin = createServiceRoleClient();
  const { error } = await admin.from("social_luot_xem").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, written: rows.length };
}

const DEDUP_LOAI = new Set(["hien_thi", "lot_man_hinh"]);

/** Gộp impression trùng trong cùng batch (client flush 4s có thể gửi 2 lần). */
function dedupSuKienBatch(events: SuKienInput[]): SuKienInput[] {
  const seen = new Set<string>();
  const out: SuKienInput[] = [];
  for (const ev of events) {
    if (!DEDUP_LOAI.has(ev.loai_su_kien)) {
      out.push(ev);
      continue;
    }
    const key = [
      ev.loai_su_kien,
      ev.loai_doi_tuong,
      ev.id_doi_tuong,
      ev.nguon ?? "",
      ev.id_boi_canh ?? "",
    ].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}

export type InsightKhoang = { tu?: string | null; den?: string | null };

export type InsightWindow = {
  tu: string | null;
  den: string;
  toanThoiGian: boolean;
};

/** Mặc định toàn thời gian (rollup + da_xem). tu/den tùy chọn, trần ~25 tháng. */
export function clampInsightWindow(raw?: InsightKhoang | null): InsightWindow {
  const maxMs = INSIGHT_ROLLUP_TOI_DA_THANG * 31 * 86_400_000;
  const hasTu = Boolean(raw?.tu);
  const hasDen = Boolean(raw?.den);
  const denParsed = raw?.den ? Date.parse(raw.den) : Number.NaN;
  const denMs = Number.isFinite(denParsed) ? denParsed : Date.now();
  if (!hasTu && !hasDen) {
    return { tu: null, den: new Date(denMs).toISOString(), toanThoiGian: true };
  }
  const tuParsed = raw?.tu ? Date.parse(raw.tu) : Number.NaN;
  let tuMs = Number.isFinite(tuParsed) ? tuParsed : denMs - maxMs;
  if (denMs - tuMs > maxMs) tuMs = denMs - maxMs;
  if (tuMs >= denMs) tuMs = denMs - maxMs;
  return {
    tu: new Date(tuMs).toISOString(),
    den: new Date(denMs).toISOString(),
    toanThoiGian: false,
  };
}

const FEED_ID_CHUNK = 200;

function chunkIds(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += FEED_ID_CHUNK) {
    out.push(ids.slice(i, i + FEED_ID_CHUNK));
  }
  return out;
}

/**
 * Số lần viewer đã tiếp cận từng đối tượng — `social_da_xem.so_lan` (PK viewer_key).
 * Khách (không viewerId) → map rỗng. Không đọc log thô.
 */
export async function demLuotXemCuaViewer(
  viewerId: string | null | undefined,
  idDoiTuongs: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!viewerId) return counts;

  const ids = [...new Set(idDoiTuongs.filter(Boolean))];
  if (ids.length === 0) return counts;

  const admin = createServiceRoleClient();
  for (const slice of chunkIds(ids)) {
    const { data, error } = await admin
      .from("social_da_xem")
      .select("id_doi_tuong, so_lan")
      .eq("viewer_key", viewerId)
      .in("id_doi_tuong", slice)
      .returns<Array<{ id_doi_tuong: string; so_lan: number | null }>>();
    if (error) {
      console.error("[su-kien] da_xem viewer", error.message);
      break;
    }
    for (const row of data ?? []) {
      counts.set(row.id_doi_tuong, Number(row.so_lan) || 0);
    }
  }
  return counts;
}

/**
 * Reach toàn cục (`luot_tiep_can`) từ `social_dem_doi_tuong`. Không đọc log thô.
 */
export async function demLuotXemToanCuc(
  idDoiTuongs: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const ids = [...new Set(idDoiTuongs.filter(Boolean))];
  if (ids.length === 0) return counts;

  const admin = createServiceRoleClient();
  for (const slice of chunkIds(ids)) {
    const { data, error } = await admin
      .from("social_dem_doi_tuong")
      .select("id_doi_tuong, luot_tiep_can")
      .in("id_doi_tuong", slice)
      .returns<Array<{ id_doi_tuong: string; luot_tiep_can: number | string | null }>>();
    if (error) {
      console.error("[su-kien] dem_doi_tuong", error.message);
      break;
    }
    for (const row of data ?? []) {
      counts.set(row.id_doi_tuong, Number(row.luot_tiep_can) || 0);
    }
  }
  return counts;
}

function toRow(
  ev: SuKienInput,
  nguoiXemId: string | null,
  phienHash: string | null,
): Record<string, unknown> {
  return {
    nguoi_xem: nguoiXemId,
    phien_id: phienHash,
    loai_su_kien: ev.loai_su_kien,
    loai_doi_tuong: ev.loai_doi_tuong,
    id_doi_tuong: ev.id_doi_tuong,
    nguon: ev.nguon ?? null,
    loai_boi_canh: ev.loai_boi_canh ?? null,
    id_boi_canh: ev.id_boi_canh ?? null,
    ngu_canh: ev.ngu_canh ?? null,
  };
}

/* ── Insight RIÊNG TƯ cho chủ bài ────────────────────────────────────── */

/** Nguồn bề mặt được xem là "trong trang tổ chức" (entity-lens / org page). */
const NGUON_TRONG_TO_CHUC: ReadonlySet<string> = new Set(["entity_lens", "org_page"]);

export type NguonBreakdownItem = { nguon: string; luot: number; nguoi: number };
export type GiaiDoanBreakdownItem = { giaiDoan: string; nguoi: number };

export type CotMocInsight = {
  luotTiepCan: number;
  tiepCanUnique: number;
  luotXemNoiDung: number;
  luotMoComment: number;
  luotClickProfile: number;
  luotXemMedia: number;
  luotClickLienKet: number;
  /** Tách lượt tiếp cận: trong trang tổ chức vs bên ngoài (theo người duy nhất). */
  tiepCanTrongToChuc: number;
  tiepCanBenNgoai: number;
  /** Chi tiết theo từng nguồn (luot = impression, nguoi = người/phiên duy nhất). */
  nguonBreakdown: NguonBreakdownItem[];
  /** Phân loại người xem duy nhất theo `giai_doan` (khách → 'khach'). */
  giaiDoanBreakdown: GiaiDoanBreakdownItem[];
};

const EMPTY_INSIGHT: CotMocInsight = {
  luotTiepCan: 0,
  tiepCanUnique: 0,
  luotXemNoiDung: 0,
  luotMoComment: 0,
  luotClickProfile: 0,
  luotXemMedia: 0,
  luotClickLienKet: 0,
  tiepCanTrongToChuc: 0,
  tiepCanBenNgoai: 0,
  nguonBreakdown: [],
  giaiDoanBreakdown: [],
};

/**
 * Kiểm tra requester có quyền xem số liệu của 1 cột mốc không.
 * Bài gắn thẻ = "bài chung của mọi người được gắn" → ai cũng xem được số liệu
 * chung. Cụ thể, cho phép nếu requester là MỘT trong:
 *   1. Tác giả gốc (`content_cot_moc.id_nguoi_dung`) — kể cả khi bài đã được
 *      tổ chức xác thực (`id_to_chuc` set).
 *   2. Đồng tác giả / người được gắn đã chấp nhận (`content_tac_pham_tac_gia`
 *      `trang_thai = accepted`) trên tác phẩm liên kết của cột mốc.
 *   3. Quản trị viên tổ chức (vai trò `owner`/`admin`, active) — chỉ khi bài
 *      thuộc tổ chức (`id_to_chuc`).
 */
export async function canViewCotMocInsight(
  cotMocId: string,
  requesterId: string | null,
): Promise<boolean> {
  if (!requesterId) return false;
  const admin = createServiceRoleClient();

  const { data: moc } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, id_to_chuc")
    .eq("id", cotMocId)
    .maybeSingle<{ id: string; id_nguoi_dung: string; id_to_chuc: string | null }>();
  if (!moc) return false;

  /* (1) Tác giả gốc — ưu tiên, không phụ thuộc tổ chức. */
  if (moc.id_nguoi_dung === requesterId) return true;

  /* (2) Người được gắn (đồng tác giả accepted) trên tác phẩm của cột mốc. */
  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_tac_pham")
    .eq("id_cot_moc", cotMocId);
  const tacPhamIds = (links ?? [])
    .map((l) => (l as { id_tac_pham: string }).id_tac_pham)
    .filter(Boolean);
  if (tacPhamIds.length > 0) {
    const { data: coAuthor } = await admin
      .from("content_tac_pham_tac_gia")
      .select("id_nguoi_dung")
      .in("id_tac_pham", tacPhamIds)
      .eq("id_nguoi_dung", requesterId)
      .eq("trang_thai", "accepted")
      .maybeSingle<{ id_nguoi_dung: string }>();
    if (coAuthor) return true;
  }

  /* (3) Quản trị viên tổ chức sở hữu bài. */
  if (moc.id_to_chuc) {
    const { data: membership } = await admin
      .from("user_thanh_vien_to_chuc")
      .select("vai_tro")
      .eq("id_to_chuc", moc.id_to_chuc)
      .eq("id_nguoi_dung", requesterId)
      .eq("trang_thai", "active")
      .in("vai_tro", ["owner", "admin"])
      .maybeSingle<{ vai_tro: string }>();
    if (membership) return true;
  }

  return false;
}

/**
 * Đọc số liệu của 1 cột mốc — rollup ngày + unique `social_da_xem` + delta hôm nay.
 * CHỈ người có quyền (`canViewCotMocInsight`). Trả null nếu không đủ quyền (phản-vanity).
 */
export async function getCotMocInsight(
  cotMocId: string,
  requesterId: string | null,
  khoang?: InsightKhoang | null,
): Promise<CotMocInsight | null> {
  if (!(await canViewCotMocInsight(cotMocId, requesterId))) return null;
  return readSubjectInsight("cot_moc", cotMocId, khoang);
}

/**
 * Kiểm tra quyền xem số liệu bài đăng tổ chức (`org_bai_dang`).
 * Chỉ quản trị viên tổ chức (vai trò `owner`/`admin`, active).
 */
export async function canViewOrgBaiDangInsight(
  baiDangId: string,
  requesterId: string | null,
): Promise<boolean> {
  if (!requesterId) return false;
  const admin = createServiceRoleClient();

  const { data: post } = await admin
    .from("org_bai_dang")
    .select("id, id_to_chuc")
    .eq("id", baiDangId)
    .maybeSingle<{ id: string; id_to_chuc: string | null }>();
  if (!post?.id_to_chuc) return false;

  const { data: membership } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("vai_tro")
    .eq("id_to_chuc", post.id_to_chuc)
    .eq("id_nguoi_dung", requesterId)
    .eq("trang_thai", "active")
    .in("vai_tro", ["owner", "admin"])
    .maybeSingle<{ vai_tro: string }>();
  return Boolean(membership);
}

/**
 * Đọc số liệu bài đăng tổ chức — rollup + da_xem. Chỉ quản trị viên tổ chức.
 * Trả null nếu không đủ quyền (phản-vanity).
 */
export async function getOrgBaiDangInsight(
  baiDangId: string,
  requesterId: string | null,
  khoang?: InsightKhoang | null,
): Promise<CotMocInsight | null> {
  if (!(await canViewOrgBaiDangInsight(baiDangId, requesterId))) return null;
  return readSubjectInsight("org_bai_dang", baiDangId, khoang);
}

/** Đọc tổng hợp số liệu (không kiểm tra quyền). Cache RAM sau auth, TTL 10 phút. */
async function readSubjectInsight(
  loai: "cot_moc" | "org_bai_dang",
  id: string,
  khoang?: InsightKhoang | null,
): Promise<CotMocInsight> {
  const win = clampInsightWindow(khoang);
  const today = ymdVnFromIso(new Date().toISOString());
  const cacheKey = win.toanThoiGian
    ? `${loai}:${id}:all:${today}`
    : `${loai}:${id}:${win.tu}:${win.den}`;
  const cached = getCachedInsight(cacheKey);
  if (cached) return cached;

  const admin = createServiceRoleClient();
  const todayTuIso = `${today}T00:00:00+07:00`;
  const denMs = Date.parse(win.den);
  const includeToday = Number.isFinite(denMs) && denMs > Date.parse(todayTuIso);
  const tuNgay = win.tu ? ymdVnFromIso(win.tu) : null;
  const denNgay = ymdVnFromIso(win.den);
  const rpcTu = win.tu && Date.parse(win.tu) > Date.parse(todayTuIso)
    ? win.tu
    : todayTuIso;

  const emptyToday = {
    luot_tiep_can: 0,
    tiep_can_unique: 0,
    luot_xem_noi_dung: 0,
    luot_mo_comment: 0,
    luot_click_profile: 0,
    luot_xem_media: 0,
    luot_click_lien_ket: 0,
  };

  const [
    dailyRows,
    nguonRows,
    nhomRows,
    uniqueCount,
    todayTotalRes,
    todayNguonRes,
    todayGiaiRes,
  ] = await Promise.all([
    selectPaged<{
      luot_tiep_can: number | null;
      luot_xem_noi_dung: number | null;
      luot_mo_comment: number | null;
      luot_click_profile: number | null;
      luot_xem_media: number | null;
      luot_click_lien_ket: number | null;
    }>((from, to) => {
      let q = admin
        .from("social_thong_ke_doi_tuong_ngay")
        .select(
          "luot_tiep_can, luot_xem_noi_dung, luot_mo_comment, luot_click_profile, luot_xem_media, luot_click_lien_ket",
        )
        .eq("loai_doi_tuong", loai)
        .eq("id_doi_tuong", id)
        .lt("ngay", today)
        .lte("ngay", denNgay);
      if (tuNgay) q = q.gte("ngay", tuNgay);
      return q.range(from, to);
    }),
    selectPaged<{
      nguon: string;
      luot_tiep_can: number | null;
      tiep_can_unique: number | null;
    }>((from, to) => {
      let q = admin
        .from("social_thong_ke_nguon_ngay")
        .select("nguon, luot_tiep_can, tiep_can_unique")
        .eq("loai_doi_tuong", loai)
        .eq("id_doi_tuong", id)
        .lt("ngay", today)
        .lte("ngay", denNgay);
      if (tuNgay) q = q.gte("ngay", tuNgay);
      return q.range(from, to);
    }),
    selectPaged<{ gia_tri: string; so_nguoi: number | null }>((from, to) => {
      let q = admin
        .from("social_thong_ke_nhom_ngay")
        .select("gia_tri, so_nguoi")
        .eq("loai_doi_tuong", loai)
        .eq("id_doi_tuong", id)
        .eq("loai_nhom", "giai_doan")
        .lt("ngay", today)
        .lte("ngay", denNgay);
      if (tuNgay) q = q.gte("ngay", tuNgay);
      return q.range(from, to);
    }),
    countDaXem(admin, loai, id, win),
    includeToday
      ? admin.rpc("social_insight_doi_tuong", {
          p_loai: loai,
          p_id: id,
          p_tu: rpcTu,
          p_den: win.den,
        })
      : Promise.resolve({ data: [emptyToday] }),
    includeToday
      ? admin.rpc("social_insight_nguon", {
          p_loai: loai,
          p_id: id,
          p_tu: rpcTu,
          p_den: win.den,
        })
      : Promise.resolve({ data: [] }),
    includeToday
      ? admin.rpc("social_insight_giai_doan", {
          p_loai: loai,
          p_id: id,
          p_tu: rpcTu,
          p_den: win.den,
        })
      : Promise.resolve({ data: [] }),
  ]);

  const todayTotal = (
    Array.isArray(todayTotalRes.data) ? todayTotalRes.data[0] : null
  ) as typeof emptyToday | null | undefined;

  const luotTiepCan =
    sumCol(dailyRows, "luot_tiep_can") + (Number(todayTotal?.luot_tiep_can) || 0);
  const luotXemNoiDung =
    sumCol(dailyRows, "luot_xem_noi_dung") +
    (Number(todayTotal?.luot_xem_noi_dung) || 0);
  const luotMoComment =
    sumCol(dailyRows, "luot_mo_comment") +
    (Number(todayTotal?.luot_mo_comment) || 0);
  const luotClickProfile =
    sumCol(dailyRows, "luot_click_profile") +
    (Number(todayTotal?.luot_click_profile) || 0);
  const luotXemMedia =
    sumCol(dailyRows, "luot_xem_media") +
    (Number(todayTotal?.luot_xem_media) || 0);
  const luotClickLienKet =
    sumCol(dailyRows, "luot_click_lien_ket") +
    (Number(todayTotal?.luot_click_lien_ket) || 0);

  const nguonMap = new Map<string, { luot: number; nguoi: number }>();
  for (const r of nguonRows) {
    const key = r.nguon || "khac";
    const cur = nguonMap.get(key) ?? { luot: 0, nguoi: 0 };
    cur.luot += Number(r.luot_tiep_can) || 0;
    cur.nguoi += Number(r.tiep_can_unique) || 0;
    nguonMap.set(key, cur);
  }
  const todayNguonRows = (
    Array.isArray(todayNguonRes.data) ? todayNguonRes.data : []
  ) as Array<{ nguon: string; luot: number | string; nguoi: number | string }>;
  for (const r of todayNguonRows) {
    const key = r.nguon || "khac";
    const cur = nguonMap.get(key) ?? { luot: 0, nguoi: 0 };
    cur.luot += Number(r.luot) || 0;
    cur.nguoi += Number(r.nguoi) || 0;
    nguonMap.set(key, cur);
  }

  const nguonBreakdown: NguonBreakdownItem[] = [...nguonMap.entries()]
    .map(([nguon, v]) => ({
      nguon,
      luot: v.luot,
      nguoi: kAnonCount(v.nguoi),
    }))
    .sort((a, b) => b.luot - a.luot);

  let tiepCanTrongToChuc = 0;
  let tiepCanBenNgoai = 0;
  for (const r of nguonBreakdown) {
    if (NGUON_TRONG_TO_CHUC.has(r.nguon)) tiepCanTrongToChuc += r.nguoi;
    else tiepCanBenNgoai += r.nguoi;
  }

  const giaiMap = new Map<string, number>();
  for (const r of nhomRows) {
    const key = r.gia_tri || "chua_khai";
    giaiMap.set(key, (giaiMap.get(key) ?? 0) + (Number(r.so_nguoi) || 0));
  }
  const todayGiaiRows = (
    Array.isArray(todayGiaiRes.data) ? todayGiaiRes.data : []
  ) as Array<{ giai_doan: string; nguoi: number | string }>;
  for (const r of todayGiaiRows) {
    const key = r.giai_doan || "chua_khai";
    giaiMap.set(key, (giaiMap.get(key) ?? 0) + (Number(r.nguoi) || 0));
  }

  const giaiDoanBreakdown: GiaiDoanBreakdownItem[] = [...giaiMap.entries()]
    .map(([giaiDoan, nguoi]) => ({ giaiDoan, nguoi: kAnonCount(nguoi) }))
    .sort((a, b) => b.nguoi - a.nguoi);

  const insight: CotMocInsight = {
    ...EMPTY_INSIGHT,
    luotTiepCan,
    tiepCanUnique: kAnonCount(uniqueCount),
    luotXemNoiDung,
    luotMoComment,
    luotClickProfile,
    luotXemMedia,
    luotClickLienKet,
    tiepCanTrongToChuc,
    tiepCanBenNgoai,
    nguonBreakdown,
    giaiDoanBreakdown,
  };
  setCachedInsight(cacheKey, insight);
  return insight;
}

const INSIGHT_CACHE_TTL_MS = 10 * 60 * 1000;
const INSIGHT_CACHE_MAX = 400;
const insightCache = new Map<string, { at: number; data: CotMocInsight }>();

function getCachedInsight(key: string): CotMocInsight | null {
  const hit = insightCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > INSIGHT_CACHE_TTL_MS) {
    insightCache.delete(key);
    return null;
  }
  return hit.data;
}

function setCachedInsight(key: string, data: CotMocInsight): void {
  if (insightCache.size >= INSIGHT_CACHE_MAX) {
    const now = Date.now();
    for (const [k, v] of insightCache) {
      if (now - v.at > INSIGHT_CACHE_TTL_MS) insightCache.delete(k);
    }
    if (insightCache.size >= INSIGHT_CACHE_MAX) {
      const first = insightCache.keys().next().value;
      if (first) insightCache.delete(first);
    }
  }
  insightCache.set(key, { at: Date.now(), data });
}

function ymdVnFromIso(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function sumCol<K extends string>(
  rows: Array<Record<K, number | null>>,
  key: K,
): number {
  let n = 0;
  for (const r of rows) n += Number(r[key]) || 0;
  return n;
}

async function selectPaged<T>(
  run: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error?: { message: string } | null }>,
): Promise<T[]> {
  const page = 1000;
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await run(from, from + page - 1);
    if (error) {
      console.error("[su-kien] insight page", error.message);
      break;
    }
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < page) break;
    from += page;
    if (from > 20_000) break;
  }
  return out;
}

async function countDaXem(
  admin: ReturnType<typeof createServiceRoleClient>,
  loai: string,
  id: string,
  win: InsightWindow,
): Promise<number> {
  let q = admin
    .from("social_da_xem")
    .select("viewer_key", { count: "exact", head: true })
    .eq("id_doi_tuong", id)
    .eq("loai_doi_tuong", loai);
  if (!win.toanThoiGian && win.tu) {
    q = q.lt("lan_dau", win.den).gte("lan_cuoi", win.tu);
  }
  const { count, error } = await q;
  if (error) {
    console.error("[su-kien] da_xem count", error.message);
    return 0;
  }
  return count ?? 0;
}
