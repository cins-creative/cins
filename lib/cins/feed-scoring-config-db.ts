import "server-only";

import {
  DEFAULT_FEED_SCORE_CONFIG,
  configFromDbRow,
  configToDbPayload,
  parseFeedScoreConfigFull,
  validateFeedScoreConfig,
  type FeedScoreConfig,
  type FeedScoreConfigDbRow,
  type FeedScorePhienBan,
  type FeedScorePhienLoai,
} from "@/lib/cins/feed-scoring-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const CACHE_TTL_MS = 15_000;

let cache: { at: number; cfg: FeedScoreConfig } | null = null;

export function invalidateFeedScoreConfigCache(): void {
  cache = null;
}

const SELECT_COLS =
  "id, base, boost_reset_score, verified, max_content, max_engagement, max_total, max_total_verified, decay_hours, content_text_min_chars, content_part, engagement_reaction, engagement_comment, engagement_luu, cap_nhat_boi, cap_nhat_luc";

const PHIEN_SELECT =
  "id, so_phien, cau_hinh, ly_do, loai, id_phien_goc, tao_boi, tao_luc";

type PhienBanRow = {
  id: string;
  so_phien: number;
  cau_hinh: unknown;
  ly_do: string;
  loai: FeedScorePhienLoai;
  id_phien_goc: string | null;
  tao_boi: string | null;
  tao_luc: string;
};

/**
 * Load singleton config. Fallback DEFAULT nếu bảng chưa migrate / lỗi.
 * Cache ngắn để scoring hot-path không query mỗi lần.
 */
export async function loadFeedScoreConfig(): Promise<FeedScoreConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.cfg;
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("content_feed_score_cau_hinh")
      .select(SELECT_COLS)
      .eq("id", 1)
      .maybeSingle<FeedScoreConfigDbRow>();

    if (error || !data) {
      if (error) {
        console.error(
          "[feed-score-config] load thất bại — dùng default:",
          error.message,
        );
      }
      cache = { at: Date.now(), cfg: DEFAULT_FEED_SCORE_CONFIG };
      return DEFAULT_FEED_SCORE_CONFIG;
    }

    const cfg = configFromDbRow(data);
    const err = validateFeedScoreConfig(cfg);
    if (err) {
      console.error("[feed-score-config] row không hợp lệ — dùng default:", err);
      cache = { at: Date.now(), cfg: DEFAULT_FEED_SCORE_CONFIG };
      return DEFAULT_FEED_SCORE_CONFIG;
    }

    cache = { at: Date.now(), cfg };
    return cfg;
  } catch (e) {
    console.error("[feed-score-config] load exception — dùng default:", e);
    cache = { at: Date.now(), cfg: DEFAULT_FEED_SCORE_CONFIG };
    return DEFAULT_FEED_SCORE_CONFIG;
  }
}

async function nextSoPhien(
  admin: ReturnType<typeof createServiceRoleClient>,
): Promise<number> {
  const { data } = await admin
    .from("content_feed_score_phien_ban")
    .select("so_phien")
    .order("so_phien", { ascending: false })
    .limit(1)
    .maybeSingle<{ so_phien: number }>();
  return (data?.so_phien ?? 0) + 1;
}

async function insertPhienBan(input: {
  config: FeedScoreConfig;
  lyDo: string;
  loai: FeedScorePhienLoai;
  actorProfileId: string;
  idPhienGoc?: string | null;
}): Promise<{ ok: true; soPhien: number } | { ok: false; message: string }> {
  const admin = createServiceRoleClient();
  const soPhien = await nextSoPhien(admin);
  const { error } = await admin.from("content_feed_score_phien_ban").insert({
    so_phien: soPhien,
    cau_hinh: input.config,
    ly_do: input.lyDo,
    loai: input.loai,
    id_phien_goc: input.idPhienGoc ?? null,
    tao_boi: input.actorProfileId,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, soPhien };
}

async function writeSingleton(
  cfg: FeedScoreConfig,
  actorProfileId: string,
): Promise<{ ok: true; config: FeedScoreConfig } | { ok: false; message: string }> {
  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  const payload = {
    id: 1,
    ...configToDbPayload(cfg),
    cap_nhat_boi: actorProfileId,
    cap_nhat_luc: nowIso,
  };

  const { data, error } = await admin
    .from("content_feed_score_cau_hinh")
    .upsert(payload, { onConflict: "id" })
    .select(SELECT_COLS)
    .single<FeedScoreConfigDbRow>();

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? "Không lưu được cấu hình điểm.",
    };
  }

  const saved = configFromDbRow(data);
  cache = { at: Date.now(), cfg: saved };
  return { ok: true, config: saved };
}

/**
 * Lưu cấu hình sống + ghi phiên bản lịch sử (bắt buộc lý do).
 */
export async function saveFeedScoreConfig(input: {
  cfg: FeedScoreConfig;
  actorProfileId: string;
  lyDo: string;
  loai?: FeedScorePhienLoai;
  idPhienGoc?: string | null;
}): Promise<
  | { ok: true; config: FeedScoreConfig; soPhien: number }
  | { ok: false; message: string }
> {
  const err = validateFeedScoreConfig(input.cfg);
  if (err) return { ok: false, message: err };

  const written = await writeSingleton(input.cfg, input.actorProfileId);
  if (!written.ok) return written;

  const phien = await insertPhienBan({
    config: written.config,
    lyDo: input.lyDo,
    loai: input.loai ?? "luu",
    actorProfileId: input.actorProfileId,
    idPhienGoc: input.idPhienGoc,
  });
  if (!phien.ok) {
    return {
      ok: false,
      message: `Đã ghi cấu hình nhưng lỗi lịch sử phiên bản: ${phien.message}`,
    };
  }

  return { ok: true, config: written.config, soPhien: phien.soPhien };
}

export async function listFeedScorePhienBan(
  limit = 40,
): Promise<FeedScorePhienBan[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("content_feed_score_phien_ban")
    .select(PHIEN_SELECT)
    .order("so_phien", { ascending: false })
    .limit(Math.max(1, Math.min(100, limit)))
    .returns<PhienBanRow[]>();

  if (error || !data) {
    if (error) {
      console.error("[feed-score-config] list phiên bản:", error.message);
    }
    return [];
  }

  const actorIds = [
    ...new Set(
      data.map((r) => r.tao_boi).filter((id): id is string => Boolean(id)),
    ),
  ];
  const nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: users } = await admin
      .from("user_nguoi_dung")
      .select("id, ten_hien_thi")
      .in("id", actorIds)
      .returns<Array<{ id: string; ten_hien_thi: string | null }>>();
    for (const u of users ?? []) {
      nameById.set(u.id, u.ten_hien_thi?.trim() || "Admin");
    }
  }

  const out: FeedScorePhienBan[] = [];
  for (const row of data) {
    const cfg = parseFeedScoreConfigFull(row.cau_hinh);
    if (!cfg) continue;
    out.push({
      id: row.id,
      soPhien: row.so_phien,
      config: cfg,
      lyDo: row.ly_do,
      loai: row.loai,
      idPhienGoc: row.id_phien_goc,
      taoBoi: row.tao_boi,
      taoBoiTen: row.tao_boi ? (nameById.get(row.tao_boi) ?? null) : null,
      taoLuc: row.tao_luc,
    });
  }
  return out;
}

export async function getFeedScorePhienBan(
  id: string,
): Promise<FeedScorePhienBan | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("content_feed_score_phien_ban")
    .select(PHIEN_SELECT)
    .eq("id", id)
    .maybeSingle<PhienBanRow>();
  if (error || !data) return null;
  const cfg = parseFeedScoreConfigFull(data.cau_hinh);
  if (!cfg) return null;
  return {
    id: data.id,
    soPhien: data.so_phien,
    config: cfg,
    lyDo: data.ly_do,
    loai: data.loai,
    idPhienGoc: data.id_phien_goc,
    taoBoi: data.tao_boi,
    taoBoiTen: null,
    taoLuc: data.tao_luc,
  };
}

/**
 * Khôi phục snapshot một phiên bản → ghi vào singleton + tạo phiên bản mới.
 */
export async function restoreFeedScorePhienBan(input: {
  phienId: string;
  actorProfileId: string;
  lyDo: string;
}): Promise<
  | { ok: true; config: FeedScoreConfig; soPhien: number }
  | { ok: false; message: string }
> {
  const phien = await getFeedScorePhienBan(input.phienId);
  if (!phien) {
    return { ok: false, message: "Không tìm thấy phiên bản." };
  }
  return saveFeedScoreConfig({
    cfg: phien.config,
    actorProfileId: input.actorProfileId,
    lyDo: input.lyDo,
    loai: "khoi_phuc",
    idPhienGoc: phien.id,
  });
}
