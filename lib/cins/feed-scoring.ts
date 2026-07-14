/**
 * Điểm World Feed Timeline (Bước 2 — brief feed scoring).
 * Chỉ áp Timeline; không Gallery / Journey / org_su_kien.
 * `diem_hien_tai` tính realtime — không lưu DB.
 */

import type { Block } from "@/lib/editor/types";
import { extractAllImageIds } from "@/lib/journey/post-block-helpers";
import {
  hasGalleryEmbedContent,
  listGalleryEmbedProviders,
} from "@/lib/journey/post-content-kind";
import {
  detectMediaPostKind,
  plainTextCardPlain,
} from "@/lib/journey/post-media";
import { isPersistedImageSeed } from "@/lib/truong/image-ref";

export const FEED_SCORE = {
  BASE: 40,
  VERIFIED: 20,
  MAX_CONTENT: 20,
  MAX_ENGAGEMENT: 20,
  MAX_TOTAL: 100,
  MAX_TOTAL_VERIFIED: 120,
  /** 7 ngày → về 0. */
  DECAY_HOURS: 168,
  /** Admin đẩy → reset diem_co_ban (kể cả verified). */
  BOOST_RESET_SCORE: 100,
  CONTENT_TEXT_MIN_CHARS: 50,
  CONTENT_PART: 5,
} as const;

/** Giây trong 7 ngày — dùng SQL `604800.0`. */
export const FEED_SCORE_DECAY_SECONDS = FEED_SCORE.DECAY_HOURS * 3600;

export type FeedScoringLoai = "cot_moc" | "org_bai_dang";

/** Hàng `content_diem_feed` (subset dùng tính điểm). */
export type ContentDiemFeed = {
  diem_co_ban: number;
  diem_noi_dung: number;
  diem_verify: number;
  diem_engagement: number;
  bat_dau_luc: Date | string;
};

/** Snapshot đủ để tính `diem_noi_dung` (caller load data). */
export type DiemNoiDungInput = {
  coverId?: string | null;
  /** cot_moc.mo_ta · org tom_tat / noi_dung. */
  moTa?: string | null;
  blocks?: ReadonlyArray<Block> | null;
  /** Đã gắn ≥1 tag article / org tag. */
  hasTag: boolean;
};

export const ENGAGEMENT_UNIT = {
  reaction: 1,
  comment: 2,
  luu: 3,
} as const;

function clampSmall(n: number, max: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(max, Math.round(n));
}

function hasThumbnail(input: DiemNoiDungInput): boolean {
  const cover = input.coverId?.trim();
  if (cover && isPersistedImageSeed(cover)) return true;
  if (extractAllImageIds(input.blocks).length > 0) return true;
  /* Video Bunny có poster / face riêng — không tính embed 3D/Figma là thumbnail. */
  if (detectMediaPostKind(input.blocks) === "video") return true;
  return false;
}

function hasMoTaDayDu(input: DiemNoiDungInput): boolean {
  const plain = plainTextCardPlain(input.moTa, input.blocks)?.trim() ?? "";
  return plain.length > FEED_SCORE.CONTENT_TEXT_MIN_CHARS;
}

/**
 * Embed sống: Sketchfab / Rive / Figma / video (Tier-1 + file .riv/.lottie + Bunny).
 * Dùng cùng detector gallery feed.
 */
function hasEmbedSong(input: DiemNoiDungInput): boolean {
  if (hasGalleryEmbedContent(input.blocks)) return true;
  if (detectMediaPostKind(input.blocks) === "video") return true;
  return listGalleryEmbedProviders(input.blocks).length > 0;
}

/** 0–20: thumbnail · mô tả · tag · embed (+5 mỗi phần). */
export function tinhDiemNoiDung(input: DiemNoiDungInput): number {
  let score = 0;
  if (hasThumbnail(input)) score += FEED_SCORE.CONTENT_PART;
  if (hasMoTaDayDu(input)) score += FEED_SCORE.CONTENT_PART;
  if (input.hasTag) score += FEED_SCORE.CONTENT_PART;
  if (hasEmbedSong(input)) score += FEED_SCORE.CONTENT_PART;
  return Math.min(FEED_SCORE.MAX_CONTENT, score);
}

/** 0 hoặc 20 — chỉ Loại 2 (`verify_xac_nhan.da_xac_nhan`) trên cot_moc. */
export function tinhDiemVerify(daXacNhan: boolean): number {
  return daXacNhan ? FEED_SCORE.VERIFIED : 0;
}

/**
 * log-scale: `min(20, round(8 * log10(n + 1)))`.
 * 1 reaction = 1 · 1 comment = 2 · 1 lưu = 3 (tính trước khi gọi).
 */
export function tinhDiemEngagement(tongDonVi: number): number {
  if (tongDonVi <= 0) return 0;
  return Math.min(
    FEED_SCORE.MAX_ENGAGEMENT,
    Math.round(8 * Math.log10(tongDonVi + 1)),
  );
}

export function tongDonViEngagement(counts: {
  reactions?: number;
  comments?: number;
  luu?: number;
}): number {
  const r = Math.max(0, counts.reactions ?? 0);
  const c = Math.max(0, counts.comments ?? 0);
  const l = Math.max(0, counts.luu ?? 0);
  return (
    r * ENGAGEMENT_UNIT.reaction +
    c * ENGAGEMENT_UNIT.comment +
    l * ENGAGEMENT_UNIT.luu
  );
}

function batDauMs(batDau: Date | string): number {
  if (batDau instanceof Date) return batDau.getTime();
  const ms = Date.parse(batDau);
  return Number.isNaN(ms) ? Date.now() : ms;
}

/** Điểm hiển thị realtime = tổng thành phần × decay tuyến tính 7 ngày. */
export function tinhDiemHienTai(
  row: ContentDiemFeed,
  nowMs: number = Date.now(),
): number {
  const tongGoc =
    row.diem_co_ban +
    row.diem_noi_dung +
    row.diem_verify +
    row.diem_engagement;
  const soGio = (nowMs - batDauMs(row.bat_dau_luc)) / 3_600_000;
  const decay = Math.max(0, 1 - soGio / FEED_SCORE.DECAY_HOURS);
  return tongGoc * decay;
}

/** Giờ còn lại đến khi điểm về ~0 (từ bat_dau_luc). */
export function gioConLaiDecay(
  batDauLuc: Date | string,
  nowMs: number = Date.now(),
): number {
  const elapsedH = (nowMs - batDauMs(batDauLuc)) / 3_600_000;
  return Math.max(0, FEED_SCORE.DECAY_HOURS - elapsedH);
}

/** Còn trong cửa sổ 7 ngày (WHERE bat_dau_luc > now() - 7 days). */
export function isWithinFeedDecayWindow(
  batDauLuc: Date | string,
  nowMs: number = Date.now(),
): boolean {
  return nowMs - batDauMs(batDauLuc) < FEED_SCORE_DECAY_SECONDS * 1000;
}

/**
 * Chưa có dòng `content_diem_feed` — điểm tạm = BASE × decay theo tao_luc
 * (giai đoạn chuyển tiếp / org_su_kien).
 */
export function tinhDiemFallbackTuTaoLuc(
  taoLuc: Date | string,
  nowMs: number = Date.now(),
): number {
  return tinhDiemHienTai(
    {
      diem_co_ban: FEED_SCORE.BASE,
      diem_noi_dung: 0,
      diem_verify: 0,
      diem_engagement: 0,
      bat_dau_luc: taoLuc,
    },
    nowMs,
  );
}

export function breakdownDiemHienTai(
  row: ContentDiemFeed,
  nowMs: number = Date.now(),
): {
  diemCoBan: number;
  diemNoiDung: number;
  diemVerify: number;
  diemEngagement: number;
  tongGoc: number;
  decayPct: number;
  diemHienTai: number;
  gioConLai: number;
} {
  const tongGoc =
    row.diem_co_ban +
    row.diem_noi_dung +
    row.diem_verify +
    row.diem_engagement;
  const soGio = (nowMs - batDauMs(row.bat_dau_luc)) / 3_600_000;
  const decay = Math.max(0, 1 - soGio / FEED_SCORE.DECAY_HOURS);
  return {
    diemCoBan: row.diem_co_ban,
    diemNoiDung: row.diem_noi_dung,
    diemVerify: row.diem_verify,
    diemEngagement: row.diem_engagement,
    tongGoc,
    decayPct: Math.round(decay * 100),
    diemHienTai: tongGoc * decay,
    gioConLai: Math.max(0, FEED_SCORE.DECAY_HOURS - soGio),
  };
}

/** Chuẩn hoá điểm thành phần khi upsert (SMALLINT an toàn). */
export function clampDiemThanhPhan(input: {
  diem_co_ban?: number;
  diem_noi_dung?: number;
  diem_verify?: number;
  diem_engagement?: number;
}): {
  diem_co_ban: number;
  diem_noi_dung: number;
  diem_verify: number;
  diem_engagement: number;
} {
  return {
    diem_co_ban: clampSmall(
      input.diem_co_ban ?? FEED_SCORE.BASE,
      FEED_SCORE.BOOST_RESET_SCORE,
    ),
    diem_noi_dung: clampSmall(
      input.diem_noi_dung ?? 0,
      FEED_SCORE.MAX_CONTENT,
    ),
    diem_verify: input.diem_verify ? FEED_SCORE.VERIFIED : 0,
    diem_engagement: clampSmall(
      input.diem_engagement ?? 0,
      FEED_SCORE.MAX_ENGAGEMENT,
    ),
  };
}
