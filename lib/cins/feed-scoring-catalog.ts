/**
 * Catalog tham chiếu công thức điểm World Timeline (L30).
 * Nhận `FeedScoreConfig` runtime — khớp admin / scoring.
 */

import {
  DEFAULT_FEED_SCORE_CONFIG,
  type FeedScoreConfig,
} from "@/lib/cins/feed-scoring-config";

export type FeedScoreCatalogRow = {
  nhom: string;
  muc: string;
  diem: string;
  dieuKien: string;
  ghiChu?: string;
};

export const FEED_SCORE_FORMULA =
  "(cơ bản + nội dung + verify + engagement) × decay tuyến tính";

export const FEED_SCORE_SCOPE =
  "Chỉ World Feed Timeline. Không áp Gallery, Journey cá nhân, feed cộng đồng, sự kiện org.";

export function buildFeedScoreCatalogRows(
  cfg: FeedScoreConfig = DEFAULT_FEED_SCORE_CONFIG,
): FeedScoreCatalogRow[] {
  const part = cfg.CONTENT_PART;
  const days = cfg.DECAY_HOURS / 24;

  return [
    {
      nhom: "Cơ bản",
      muc: "Đăng bài",
      diem: String(cfg.BASE),
      dieuKien: "Mỗi bài vào pool Timeline",
      ghiChu: "Tắt đẩy → khôi phục về mức này",
    },
    {
      nhom: "Cơ bản",
      muc: "Admin đẩy",
      diem: String(cfg.BOOST_RESET_SCORE),
      dieuKien: "Bật boost trên /admin hoặc World feed",
      ghiChu: "ON đẩy → diem_co_ban + reset decay (TTL 3 ngày L29 riêng)",
    },
    {
      nhom: "Nội dung",
      muc: "Thumbnail",
      diem: `+${part}`,
      dieuKien: "Có cover_id, hoặc ảnh trong album/blocks, hoặc video",
      ghiChu: "Admin thumb chỉ hiện cover_id — album đã có ảnh vẫn đã cộng",
    },
    {
      nhom: "Nội dung",
      muc: "Mô tả",
      diem: `+${part}`,
      dieuKien: `Text thường > ${cfg.CONTENT_TEXT_MIN_CHARS} ký tự`,
    },
    {
      nhom: "Nội dung",
      muc: "Tag",
      diem: `+${part}`,
      dieuKien: "Đã gắn ≥ 1 tag",
    },
    {
      nhom: "Nội dung",
      muc: "Embed sống",
      diem: `+${part}`,
      dieuKien: "Sketchfab / Rive / Figma / video…",
      ghiChu: `Tối đa nội dung ${cfg.MAX_CONTENT}`,
    },
    {
      nhom: "Verify",
      muc: "Chưa xác thực Loại 2",
      diem: "0",
      dieuKien: "Chỉ áp cột mốc user (cot_moc)",
    },
    {
      nhom: "Verify",
      muc: "Đã xác thực Loại 2",
      diem: String(cfg.VERIFIED),
      dieuKien: "verify_xac_nhan.da_xac_nhan",
      ghiChu: `Trần tổng ${cfg.MAX_TOTAL_VERIFIED}`,
    },
    {
      nhom: "Engagement",
      muc: "Reaction",
      diem: `×${cfg.ENGAGEMENT_REACTION} đơn vị`,
      dieuKien: "Mỗi reaction",
      ghiChu: `điểm = min(${cfg.MAX_ENGAGEMENT}, round(8 × log10(n+1)))`,
    },
    {
      nhom: "Engagement",
      muc: "Comment",
      diem: `×${cfg.ENGAGEMENT_COMMENT} đơn vị`,
      dieuKien: "Mỗi comment (chưa xóa)",
    },
    {
      nhom: "Engagement",
      muc: "Lưu",
      diem: `×${cfg.ENGAGEMENT_LUU} đơn vị`,
      dieuKien: "Mỗi lần lưu bài",
    },
    {
      nhom: "Decay",
      muc: `Cửa sổ ${days} ngày (${cfg.DECAY_HOURS} giờ)`,
      diem: `× (1 − giờ/${cfg.DECAY_HOURS})`,
      dieuKien: "Tuyến tính từ bat_dau_luc đến 0",
      ghiChu: "Sửa bài không reset; admin đẩy có reset",
    },
    {
      nhom: "Trần",
      muc: "Không verify",
      diem: String(cfg.MAX_TOTAL),
      dieuKien: "Trần thanh progress admin",
    },
    {
      nhom: "Trần",
      muc: "Có verify",
      diem: String(cfg.MAX_TOTAL_VERIFIED),
      dieuKien: "Trần thanh progress admin",
    },
  ];
}

/** Ví dụ phân bổ — chỉ minh họa; không phải điểm DB. */
export function buildFeedScoreExampleRows(
  cfg: FeedScoreConfig = DEFAULT_FEED_SCORE_CONFIG,
): Array<{
  ten: string;
  thanhPhan: string;
  tongGoc: number;
}> {
  const base = cfg.BASE;
  const part = cfg.CONTENT_PART;
  return [
    {
      ten: "Album có ảnh, chưa mô tả/tag/embed",
      thanhPhan: `${base} cơ bản + ${part} thumbnail`,
      tongGoc: base + part,
    },
    {
      ten: "Album + mô tả dài + tag",
      thanhPhan: `${base} + ${part * 3} nội dung`,
      tongGoc: base + part * 3,
    },
    {
      ten: "Bài verified đầy đủ nội dung, chưa engagement",
      thanhPhan: `${base} + ${cfg.MAX_CONTENT} + ${cfg.VERIFIED}`,
      tongGoc: base + cfg.MAX_CONTENT + cfg.VERIFIED,
    },
    {
      ten: "Admin đẩy bài thường",
      thanhPhan: `${cfg.BOOST_RESET_SCORE} cơ bản (giữ nội dung/verify/eng hiện có)`,
      tongGoc: cfg.BOOST_RESET_SCORE,
    },
  ];
}
