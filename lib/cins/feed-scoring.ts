/**
 * Điểm World Feed Timeline (Bước 2 — brief feed scoring).
 * Chỉ áp Timeline; không Gallery / Journey / org_su_kien.
 * `diem_hien_tai` tính realtime — không lưu DB.
 * Trọng số runtime: truyền `FeedScoreConfig` (từ DB); fallback DEFAULT.
 */

import type { Block } from "@/lib/editor/types";
import {
  DEFAULT_FEED_SCORE_CONFIG,
  engagementUnitsFromConfig,
  type FeedScoreConfig,
} from "@/lib/cins/feed-scoring-config";
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

/** Default tĩnh — khớp seed DB / DEFAULT_FEED_SCORE_CONFIG. */
export const FEED_SCORE = {
  BASE: DEFAULT_FEED_SCORE_CONFIG.BASE,
  VERIFIED: DEFAULT_FEED_SCORE_CONFIG.VERIFIED,
  MAX_CONTENT: DEFAULT_FEED_SCORE_CONFIG.MAX_CONTENT,
  MAX_ENGAGEMENT: DEFAULT_FEED_SCORE_CONFIG.MAX_ENGAGEMENT,
  MAX_TOTAL: DEFAULT_FEED_SCORE_CONFIG.MAX_TOTAL,
  MAX_TOTAL_VERIFIED: DEFAULT_FEED_SCORE_CONFIG.MAX_TOTAL_VERIFIED,
  DECAY_HOURS: DEFAULT_FEED_SCORE_CONFIG.DECAY_HOURS,
  BOOST_RESET_SCORE: DEFAULT_FEED_SCORE_CONFIG.BOOST_RESET_SCORE,
  CONTENT_TEXT_MIN_CHARS: DEFAULT_FEED_SCORE_CONFIG.CONTENT_TEXT_MIN_CHARS,
  CONTENT_PART: DEFAULT_FEED_SCORE_CONFIG.CONTENT_PART,
} as const;

/** Cộng tay admin (nút +) — không hoàn lại, không bị tắt đẩy xóa. */
export const ADMIN_DIEM_UU_TIEN = {
  BUMP: 10,
  MAX: 200,
} as const;

/** Giây mặc định 7 ngày — runtime dùng `feedScoreDecaySeconds(cfg)`. */
export const FEED_SCORE_DECAY_SECONDS = FEED_SCORE.DECAY_HOURS * 3600;

export type FeedScoringLoai = "cot_moc" | "org_bai_dang";

/** Hàng `content_diem_feed` (subset dùng tính điểm). */
export type ContentDiemFeed = {
  diem_co_ban: number;
  diem_noi_dung: number;
  diem_verify: number;
  diem_engagement: number;
  /** Ưu tiên admin cộng tay — không hoàn lại. */
  diem_uu_tien?: number;
  bat_dau_luc: Date | string;
};

function diemUuTienOf(row: ContentDiemFeed): number {
  const n = row.diem_uu_tien ?? 0;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(ADMIN_DIEM_UU_TIEN.MAX, Math.round(n));
}

function tongGocDiem(row: ContentDiemFeed): number {
  return (
    row.diem_co_ban +
    row.diem_noi_dung +
    row.diem_verify +
    row.diem_engagement +
    diemUuTienOf(row)
  );
}

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
  reaction: DEFAULT_FEED_SCORE_CONFIG.ENGAGEMENT_REACTION,
  comment: DEFAULT_FEED_SCORE_CONFIG.ENGAGEMENT_COMMENT,
  luu: DEFAULT_FEED_SCORE_CONFIG.ENGAGEMENT_LUU,
} as const;

function cfgOrDefault(cfg?: FeedScoreConfig): FeedScoreConfig {
  return cfg ?? DEFAULT_FEED_SCORE_CONFIG;
}

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

function hasMoTaDayDu(
  input: DiemNoiDungInput,
  cfg: FeedScoreConfig,
): boolean {
  const plain = plainTextCardPlain(input.moTa, input.blocks)?.trim() ?? "";
  return plain.length > cfg.CONTENT_TEXT_MIN_CHARS;
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

/** Thumbnail · mô tả · tag · embed (+CONTENT_PART mỗi phần). */
export function tinhDiemNoiDung(
  input: DiemNoiDungInput,
  cfg?: FeedScoreConfig,
): number {
  const c = cfgOrDefault(cfg);
  let score = 0;
  if (hasThumbnail(input)) score += c.CONTENT_PART;
  if (hasMoTaDayDu(input, c)) score += c.CONTENT_PART;
  if (input.hasTag) score += c.CONTENT_PART;
  if (hasEmbedSong(input)) score += c.CONTENT_PART;
  return Math.min(c.MAX_CONTENT, score);
}

/** 0 hoặc VERIFIED — chỉ Loại 2 (`verify_xac_nhan.da_xac_nhan`) trên cot_moc. */
export function tinhDiemVerify(
  daXacNhan: boolean,
  cfg?: FeedScoreConfig,
): number {
  const c = cfgOrDefault(cfg);
  return daXacNhan ? c.VERIFIED : 0;
}

/**
 * log-scale: `min(MAX_ENGAGEMENT, round(8 * log10(n + 1)))`.
 * Đơn vị engagement tính trước khi gọi (`tongDonViEngagement`).
 */
export function tinhDiemEngagement(
  tongDonVi: number,
  cfg?: FeedScoreConfig,
): number {
  const c = cfgOrDefault(cfg);
  if (tongDonVi <= 0) return 0;
  return Math.min(c.MAX_ENGAGEMENT, Math.round(8 * Math.log10(tongDonVi + 1)));
}

export function tongDonViEngagement(
  counts: {
    reactions?: number;
    comments?: number;
    luu?: number;
  },
  cfg?: FeedScoreConfig,
): number {
  const units = engagementUnitsFromConfig(cfgOrDefault(cfg));
  const r = Math.max(0, counts.reactions ?? 0);
  const c = Math.max(0, counts.comments ?? 0);
  const l = Math.max(0, counts.luu ?? 0);
  return r * units.reaction + c * units.comment + l * units.luu;
}

function batDauMs(batDau: Date | string): number {
  if (batDau instanceof Date) return batDau.getTime();
  const ms = Date.parse(batDau);
  return Number.isNaN(ms) ? Date.now() : ms;
}

/** Điểm hiển thị realtime = tổng thành phần × decay tuyến tính. */
export function tinhDiemHienTai(
  row: ContentDiemFeed,
  nowMs: number = Date.now(),
  cfg?: FeedScoreConfig,
): number {
  const c = cfgOrDefault(cfg);
  const tongGoc = tongGocDiem(row);
  const soGio = (nowMs - batDauMs(row.bat_dau_luc)) / 3_600_000;
  const decay = Math.max(0, 1 - soGio / c.DECAY_HOURS);
  return tongGoc * decay;
}

/** Giờ còn lại đến khi điểm về ~0 (từ bat_dau_luc). */
export function gioConLaiDecay(
  batDauLuc: Date | string,
  nowMs: number = Date.now(),
  cfg?: FeedScoreConfig,
): number {
  const c = cfgOrDefault(cfg);
  const elapsedH = (nowMs - batDauMs(batDauLuc)) / 3_600_000;
  return Math.max(0, c.DECAY_HOURS - elapsedH);
}

/** Còn trong cửa sổ decay (WHERE bat_dau_luc > now() - decay). */
export function isWithinFeedDecayWindow(
  batDauLuc: Date | string,
  nowMs: number = Date.now(),
  cfg?: FeedScoreConfig,
): boolean {
  const c = cfgOrDefault(cfg);
  const decayMs = Math.max(1, c.DECAY_HOURS) * 3600 * 1000;
  return nowMs - batDauMs(batDauLuc) < decayMs;
}

/**
 * Chưa có dòng `content_diem_feed` — điểm tạm = BASE × decay theo tao_luc
 * (giai đoạn chuyển tiếp / org_su_kien).
 */
export function tinhDiemFallbackTuTaoLuc(
  taoLuc: Date | string,
  nowMs: number = Date.now(),
  cfg?: FeedScoreConfig,
): number {
  const c = cfgOrDefault(cfg);
  return tinhDiemHienTai(
    {
      diem_co_ban: c.BASE,
      diem_noi_dung: 0,
      diem_verify: 0,
      diem_engagement: 0,
      diem_uu_tien: 0,
      bat_dau_luc: taoLuc,
    },
    nowMs,
    c,
  );
}

export function breakdownDiemHienTai(
  row: ContentDiemFeed,
  nowMs: number = Date.now(),
  cfg?: FeedScoreConfig,
): {
  diemCoBan: number;
  diemNoiDung: number;
  diemVerify: number;
  diemEngagement: number;
  diemUuTien: number;
  tongGoc: number;
  decayPct: number;
  diemHienTai: number;
  gioConLai: number;
} {
  const c = cfgOrDefault(cfg);
  const diemUuTien = diemUuTienOf(row);
  const tongGoc = tongGocDiem(row);
  const soGio = (nowMs - batDauMs(row.bat_dau_luc)) / 3_600_000;
  const decay = Math.max(0, 1 - soGio / c.DECAY_HOURS);
  return {
    diemCoBan: row.diem_co_ban,
    diemNoiDung: row.diem_noi_dung,
    diemVerify: row.diem_verify,
    diemEngagement: row.diem_engagement,
    diemUuTien,
    tongGoc,
    decayPct: Math.round(decay * 100),
    diemHienTai: tongGoc * decay,
    gioConLai: Math.max(0, c.DECAY_HOURS - soGio),
  };
}

/** Chuẩn hoá điểm thành phần khi upsert (SMALLINT an toàn). */
export function clampDiemThanhPhan(
  input: {
    diem_co_ban?: number;
    diem_noi_dung?: number;
    diem_verify?: number;
    diem_engagement?: number;
  },
  cfg?: FeedScoreConfig,
): {
  diem_co_ban: number;
  diem_noi_dung: number;
  diem_verify: number;
  diem_engagement: number;
} {
  const c = cfgOrDefault(cfg);
  return {
    diem_co_ban: clampSmall(input.diem_co_ban ?? c.BASE, c.BOOST_RESET_SCORE),
    diem_noi_dung: clampSmall(input.diem_noi_dung ?? 0, c.MAX_CONTENT),
    diem_verify: input.diem_verify ? c.VERIFIED : 0,
    diem_engagement: clampSmall(input.diem_engagement ?? 0, c.MAX_ENGAGEMENT),
  };
}
