import { NextResponse } from "next/server";

import {
  DEFAULT_FEED_SCORE_CONFIG,
  mergeFeedScoreConfig,
  normalizeFeedScoreLyDo,
  parseFeedScoreConfigPartial,
  validateFeedScoreConfig,
} from "@/lib/cins/feed-scoring-config";
import {
  listFeedScorePhienBan,
  loadFeedScoreConfig,
  restoreFeedScorePhienBan,
  saveFeedScoreConfig,
} from "@/lib/cins/feed-scoring-config-db";
import {
  canManageUsers,
  getCurrentUserProfileId,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

async function requireScoreAdmin() {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }
  const profileId = await getCurrentUserProfileId();
  if (!profileId) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  return { ok: true as const, profileId };
}

export async function GET(request: Request) {
  const gate = await requireScoreAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("versions") === "1") {
    const limit = Math.max(1, Number(searchParams.get("limit") ?? 40) || 40);
    const versions = await listFeedScorePhienBan(limit);
    return NextResponse.json({ versions });
  }

  const config = await loadFeedScoreConfig();
  const versions = await listFeedScorePhienBan(40);
  return NextResponse.json({
    config,
    defaults: DEFAULT_FEED_SCORE_CONFIG,
    versions,
  });
}

export async function PUT(request: Request) {
  const gate = await requireScoreAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rec =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const lyDoParsed = normalizeFeedScoreLyDo(rec.lyDo ?? rec.ly_do);
  if (!lyDoParsed.ok) {
    return NextResponse.json({ error: lyDoParsed.message }, { status: 422 });
  }

  /* Khôi phục phiên bản cũ → phiên bản mới. */
  const restoreId =
    typeof rec.restoreId === "string" ? rec.restoreId.trim() : "";
  if (restoreId) {
    const result = await restoreFeedScorePhienBan({
      phienId: restoreId,
      actorProfileId: gate.profileId,
      lyDo: lyDoParsed.lyDo,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
    const versions = await listFeedScorePhienBan(40);
    return NextResponse.json({
      ok: true,
      config: result.config,
      soPhien: result.soPhien,
      defaults: DEFAULT_FEED_SCORE_CONFIG,
      versions,
    });
  }

  if (rec.reset === true) {
    const result = await saveFeedScoreConfig({
      cfg: DEFAULT_FEED_SCORE_CONFIG,
      actorProfileId: gate.profileId,
      lyDo: lyDoParsed.lyDo,
      loai: "mac_dinh",
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
    const versions = await listFeedScorePhienBan(40);
    return NextResponse.json({
      ok: true,
      config: result.config,
      soPhien: result.soPhien,
      defaults: DEFAULT_FEED_SCORE_CONFIG,
      versions,
    });
  }

  const patch = parseFeedScoreConfigPartial(rec.config ?? rec);
  if (!patch || Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Thiếu object config hợp lệ." },
      { status: 400 },
    );
  }

  const current = await loadFeedScoreConfig();
  const next = mergeFeedScoreConfig(current, patch);
  const invalid = validateFeedScoreConfig(next);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 422 });
  }

  const result = await saveFeedScoreConfig({
    cfg: next,
    actorProfileId: gate.profileId,
    lyDo: lyDoParsed.lyDo,
    loai: "luu",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  const versions = await listFeedScorePhienBan(40);
  return NextResponse.json({
    ok: true,
    config: result.config,
    soPhien: result.soPhien,
    defaults: DEFAULT_FEED_SCORE_CONFIG,
    versions,
  });
}
