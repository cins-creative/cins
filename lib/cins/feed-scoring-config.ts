/**
 * Trọng số điểm World Timeline (L30) — type / default / validate (client-safe).
 * Đọc/ghi DB: `feed-scoring-config-db.ts` (server-only).
 * Default khớp `FEED_SCORE` / `ENGAGEMENT_UNIT` trong feed-scoring.ts (không import chéo).
 */

export type FeedScoreConfig = {
  BASE: number;
  BOOST_RESET_SCORE: number;
  VERIFIED: number;
  MAX_CONTENT: number;
  MAX_ENGAGEMENT: number;
  MAX_TOTAL: number;
  MAX_TOTAL_VERIFIED: number;
  DECAY_HOURS: number;
  CONTENT_TEXT_MIN_CHARS: number;
  CONTENT_PART: number;
  ENGAGEMENT_REACTION: number;
  ENGAGEMENT_COMMENT: number;
  ENGAGEMENT_LUU: number;
};

export const DEFAULT_FEED_SCORE_CONFIG: FeedScoreConfig = {
  BASE: 40,
  BOOST_RESET_SCORE: 100,
  VERIFIED: 20,
  MAX_CONTENT: 20,
  MAX_ENGAGEMENT: 20,
  MAX_TOTAL: 100,
  MAX_TOTAL_VERIFIED: 120,
  DECAY_HOURS: 168,
  CONTENT_TEXT_MIN_CHARS: 50,
  CONTENT_PART: 5,
  ENGAGEMENT_REACTION: 1,
  ENGAGEMENT_COMMENT: 2,
  ENGAGEMENT_LUU: 3,
};

export const FEED_SCORE_CONFIG_KEYS = Object.keys(
  DEFAULT_FEED_SCORE_CONFIG,
) as Array<keyof FeedScoreConfig>;

export type FeedScoreEditableMeta = {
  key: keyof FeedScoreConfig;
  nhom: string;
  muc: string;
  dieuKien: string;
  ghiChu?: string;
  /** Liên kết ON/OFF đẩy bài (L30). */
  lienKetDay?: boolean;
};

export const FEED_SCORE_EDITABLE_META: FeedScoreEditableMeta[] = [
  {
    key: "BASE",
    nhom: "Cơ bản",
    muc: "Đăng bài",
    dieuKien: "Mỗi bài vào pool Timeline",
    ghiChu: "Tắt đẩy → khôi phục về mức này",
    lienKetDay: true,
  },
  {
    key: "BOOST_RESET_SCORE",
    nhom: "Cơ bản",
    muc: "Admin đẩy",
    dieuKien: "Bật boost trên /admin hoặc World feed",
    ghiChu: "ON đẩy → diem_co_ban = số này + reset decay",
    lienKetDay: true,
  },
  {
    key: "CONTENT_PART",
    nhom: "Nội dung",
    muc: "Điểm mỗi mục nội dung",
    dieuKien: "Thumbnail · mô tả · tag · embed (mỗi mục)",
    ghiChu: "Admin thumb: cover_id hoặc ảnh đầu album",
  },
  {
    key: "CONTENT_TEXT_MIN_CHARS",
    nhom: "Nội dung",
    muc: "Ngưỡng mô tả (ký tự)",
    dieuKien: "Text thường phải dài hơn mức này mới +CONTENT_PART",
  },
  {
    key: "MAX_CONTENT",
    nhom: "Nội dung",
    muc: "Trần nội dung",
    dieuKien: "Tổng tối đa 4 mục nội dung",
  },
  {
    key: "VERIFIED",
    nhom: "Verify",
    muc: "Đã xác thực Loại 2",
    dieuKien: "verify_xac_nhan.da_xac_nhan (chỉ cot_moc)",
  },
  {
    key: "ENGAGEMENT_REACTION",
    nhom: "Engagement",
    muc: "Đơn vị reaction",
    dieuKien: "Mỗi reaction",
    ghiChu: "điểm = min(MAX_ENGAGEMENT, round(8 × log10(n+1)))",
  },
  {
    key: "ENGAGEMENT_COMMENT",
    nhom: "Engagement",
    muc: "Đơn vị comment",
    dieuKien: "Mỗi comment (chưa xóa)",
  },
  {
    key: "ENGAGEMENT_LUU",
    nhom: "Engagement",
    muc: "Đơn vị lưu",
    dieuKien: "Mỗi lần lưu bài",
  },
  {
    key: "MAX_ENGAGEMENT",
    nhom: "Engagement",
    muc: "Trần engagement",
    dieuKien: "Cap sau log-scale",
  },
  {
    key: "DECAY_HOURS",
    nhom: "Decay",
    muc: "Cửa sổ decay (giờ)",
    dieuKien: "Tuyến tính từ bat_dau_luc đến 0",
    ghiChu: "Sửa bài không reset; admin đẩy có reset. Đổi số ảnh hưởng realtime ngay.",
  },
  {
    key: "MAX_TOTAL",
    nhom: "Trần",
    muc: "Không verify",
    dieuKien: "Trần thanh progress admin",
  },
  {
    key: "MAX_TOTAL_VERIFIED",
    nhom: "Trần",
    muc: "Có verify",
    dieuKien: "Trần thanh progress admin",
  },
];

export function feedScoreDecaySeconds(cfg: FeedScoreConfig): number {
  return Math.max(1, cfg.DECAY_HOURS) * 3600;
}

export function engagementUnitsFromConfig(cfg: FeedScoreConfig): {
  reaction: number;
  comment: number;
  luu: number;
} {
  return {
    reaction: cfg.ENGAGEMENT_REACTION,
    comment: cfg.ENGAGEMENT_COMMENT,
    luu: cfg.ENGAGEMENT_LUU,
  };
}

function asInt(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.round(n);
}

export function parseFeedScoreConfigPartial(
  raw: unknown,
): Partial<FeedScoreConfig> | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const out: Partial<FeedScoreConfig> = {};
  for (const key of FEED_SCORE_CONFIG_KEYS) {
    if (!(key in rec)) continue;
    const v = asInt(rec[key]);
    if (v == null) return null;
    out[key] = v;
  }
  return out;
}

export function mergeFeedScoreConfig(
  base: FeedScoreConfig,
  patch: Partial<FeedScoreConfig>,
): FeedScoreConfig {
  return { ...base, ...patch };
}

export type FeedScorePhienLoai = "luu" | "khoi_phuc" | "mac_dinh" | "seed";

export type FeedScorePhienBan = {
  id: string;
  soPhien: number;
  config: FeedScoreConfig;
  lyDo: string;
  loai: FeedScorePhienLoai;
  idPhienGoc: string | null;
  taoBoi: string | null;
  taoBoiTen: string | null;
  taoLuc: string;
};

/** Lý do lưu phiên bản — 3–500 ký tự. */
export function normalizeFeedScoreLyDo(
  raw: unknown,
): { ok: true; lyDo: string } | { ok: false; message: string } {
  if (typeof raw !== "string") {
    return { ok: false, message: "Cần nhập lý do thay đổi." };
  }
  const lyDo = raw.trim().replace(/\s+/g, " ");
  if (lyDo.length < 3) {
    return { ok: false, message: "Lý do thay đổi tối thiểu 3 ký tự." };
  }
  if (lyDo.length > 500) {
    return { ok: false, message: "Lý do thay đổi tối đa 500 ký tự." };
  }
  return { ok: true, lyDo };
}

/** Parse snapshot JSON → config đầy đủ hoặc null. */
export function parseFeedScoreConfigFull(
  raw: unknown,
): FeedScoreConfig | null {
  const partial = parseFeedScoreConfigPartial(raw);
  if (!partial) return null;
  for (const key of FEED_SCORE_CONFIG_KEYS) {
    if (partial[key] === undefined) return null;
  }
  const cfg = mergeFeedScoreConfig(DEFAULT_FEED_SCORE_CONFIG, partial);
  if (validateFeedScoreConfig(cfg)) return null;
  return cfg;
}

/** Validate khoảng an toàn. Trả message lỗi hoặc null nếu OK. */
export function validateFeedScoreConfig(cfg: FeedScoreConfig): string | null {
  const ranges: Array<[keyof FeedScoreConfig, number, number]> = [
    ["BASE", 0, 100],
    ["BOOST_RESET_SCORE", 0, 200],
    ["VERIFIED", 0, 100],
    ["MAX_CONTENT", 0, 100],
    ["MAX_ENGAGEMENT", 0, 100],
    ["MAX_TOTAL", 1, 300],
    ["MAX_TOTAL_VERIFIED", 1, 400],
    ["DECAY_HOURS", 24, 720],
    ["CONTENT_TEXT_MIN_CHARS", 0, 500],
    ["CONTENT_PART", 0, 50],
    ["ENGAGEMENT_REACTION", 0, 20],
    ["ENGAGEMENT_COMMENT", 0, 20],
    ["ENGAGEMENT_LUU", 0, 20],
  ];
  for (const [key, min, max] of ranges) {
    const v = cfg[key];
    if (!Number.isInteger(v) || v < min || v > max) {
      return `${key} phải là số nguyên trong [${min}, ${max}].`;
    }
  }
  if (cfg.BOOST_RESET_SCORE < cfg.BASE) {
    return "BOOST_RESET_SCORE phải ≥ BASE.";
  }
  if (cfg.CONTENT_PART * 4 > cfg.MAX_CONTENT && cfg.MAX_CONTENT > 0) {
    /* Cho phép MAX_CONTENT < 4*part (cap sẽ cắt) — chỉ cảnh báo mềm: không fail. */
  }
  if (cfg.MAX_TOTAL_VERIFIED < cfg.MAX_TOTAL) {
    return "MAX_TOTAL_VERIFIED phải ≥ MAX_TOTAL.";
  }
  return null;
}

export type FeedScoreConfigDbRow = {
  id: number;
  base: number;
  boost_reset_score: number;
  verified: number;
  max_content: number;
  max_engagement: number;
  max_total: number;
  max_total_verified: number;
  decay_hours: number;
  content_text_min_chars: number;
  content_part: number;
  engagement_reaction: number;
  engagement_comment: number;
  engagement_luu: number;
  cap_nhat_boi: string | null;
  cap_nhat_luc: string;
};

export function configFromDbRow(row: FeedScoreConfigDbRow): FeedScoreConfig {
  return {
    BASE: row.base,
    BOOST_RESET_SCORE: row.boost_reset_score,
    VERIFIED: row.verified,
    MAX_CONTENT: row.max_content,
    MAX_ENGAGEMENT: row.max_engagement,
    MAX_TOTAL: row.max_total,
    MAX_TOTAL_VERIFIED: row.max_total_verified,
    DECAY_HOURS: row.decay_hours,
    CONTENT_TEXT_MIN_CHARS: row.content_text_min_chars,
    CONTENT_PART: row.content_part,
    ENGAGEMENT_REACTION: row.engagement_reaction,
    ENGAGEMENT_COMMENT: row.engagement_comment,
    ENGAGEMENT_LUU: row.engagement_luu,
  };
}

export function configToDbPayload(cfg: FeedScoreConfig): Omit<
  FeedScoreConfigDbRow,
  "id" | "cap_nhat_boi" | "cap_nhat_luc"
> {
  return {
    base: cfg.BASE,
    boost_reset_score: cfg.BOOST_RESET_SCORE,
    verified: cfg.VERIFIED,
    max_content: cfg.MAX_CONTENT,
    max_engagement: cfg.MAX_ENGAGEMENT,
    max_total: cfg.MAX_TOTAL,
    max_total_verified: cfg.MAX_TOTAL_VERIFIED,
    decay_hours: cfg.DECAY_HOURS,
    content_text_min_chars: cfg.CONTENT_TEXT_MIN_CHARS,
    content_part: cfg.CONTENT_PART,
    engagement_reaction: cfg.ENGAGEMENT_REACTION,
    engagement_comment: cfg.ENGAGEMENT_COMMENT,
    engagement_luu: cfg.ENGAGEMENT_LUU,
  };
}
