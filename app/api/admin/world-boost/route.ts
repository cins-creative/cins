import { NextResponse } from "next/server";

import {
  fetchWorldBoostGrowth,
  fetchWorldBoostStats,
  listWorldBoostCatalog,
  type WorldBoostCatalogNguon,
  type WorldBoostDinhDangFilter,
  type WorldBoostXacThucFilter,
} from "@/lib/cins/world-boost-admin";
import {
  countPendingOrgMilestoneTagVerifies,
  listPendingOrgMilestoneTagVerifies,
} from "@/lib/admin/pending-content-verify";
import { bumpAdminDiemUuTien } from "@/lib/cins/feed-scoring-write";
import type { FeedScoringLoai } from "@/lib/cins/feed-scoring";
import {
  parseWorldBoostLoai,
  toggleWorldBoost,
} from "@/lib/cins/world-boost";
import {
  canManageUsers,
  getCurrentUserProfileId,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

async function requireBoostAdmin() {
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
  const gate = await requireBoostAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("stats") === "1") {
    const stats = await fetchWorldBoostStats();
    return NextResponse.json({ stats });
  }

  if (searchParams.get("pendingVerifyStats") === "1") {
    try {
      const pendingVerifyCount = await countPendingOrgMilestoneTagVerifies();
      return NextResponse.json({ pendingVerifyCount });
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Không tải được số nội dung chờ xác thực.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (searchParams.get("pendingVerify") === "1") {
    try {
      const page = await listPendingOrgMilestoneTagVerifies({
        offset: Math.max(0, Number(searchParams.get("offset") ?? 0) || 0),
        limit: Math.max(1, Number(searchParams.get("limit") ?? 60) || 60),
      });
      return NextResponse.json(page);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Không tải được hàng đợi chờ xác thực.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (searchParams.get("growth") === "1") {
    const daysRaw = Number(searchParams.get("days") ?? 30);
    const days = daysRaw <= 7 ? 7 : 30;
    try {
      const growth = await fetchWorldBoostGrowth(days);
      return NextResponse.json({ growth });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Không tải được biểu đồ tăng trưởng.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const nguonRaw = searchParams.get("nguon") ?? "all";
  const nguon =
    nguonRaw === "user" || nguonRaw === "org" || nguonRaw === "all"
      ? (nguonRaw as WorldBoostCatalogNguon | "all")
      : "all";

  const dinhDangRaw = searchParams.get("dinhDang") ?? "all";
  const dinhDang: WorldBoostDinhDangFilter =
    dinhDangRaw === "photo" ||
    dinhDangRaw === "video" ||
    dinhDangRaw === "article" ||
    dinhDangRaw === "embed"
      ? dinhDangRaw
      : "all";

  const xacThucRaw = searchParams.get("xacThuc") ?? "all";
  const xacThuc: WorldBoostXacThucFilter =
    xacThucRaw === "verified" || xacThucRaw === "unverified"
      ? xacThucRaw
      : "all";

  const page = await listWorldBoostCatalog({
    nguon,
    dinhDang,
    xacThuc,
    chiDangBoost: searchParams.get("boost") === "1",
    q: searchParams.get("q") ?? undefined,
    offset: Math.max(0, Number(searchParams.get("offset") ?? 0) || 0),
    limit: Math.max(1, Number(searchParams.get("limit") ?? 48) || 48),
  });

  return NextResponse.json(page);
}

export async function POST(request: Request) {
  const gate = await requireBoostAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const loai = parseWorldBoostLoai(
    typeof rec.loai === "string" ? rec.loai : null,
  );
  const id = typeof rec.id === "string" ? rec.id.trim() : "";
  const action = typeof rec.action === "string" ? rec.action.trim() : "toggle";

  if (!loai || !id) {
    return NextResponse.json(
      { error: "Thiếu loai hoặc id đối tượng." },
      { status: 400 },
    );
  }

  /* Cộng/trừ điểm ưu tiên (±5 / +10, trần 200). */
  if (action === "bump") {
    if (loai !== "cot_moc" && loai !== "org_bai_dang") {
      return NextResponse.json(
        { error: "Chỉ chỉnh điểm cho bài user / bài org." },
        { status: 422 },
      );
    }
    const rawDelta = rec.delta;
    const delta =
      typeof rawDelta === "number"
        ? rawDelta
        : typeof rawDelta === "string" && rawDelta.trim() !== ""
          ? Number(rawDelta)
          : undefined;
    const bump = await bumpAdminDiemUuTien({
      loai: loai as FeedScoringLoai,
      id,
      actorProfileId: gate.profileId,
      delta,
    });
    if (!bump.ok) {
      const status =
        bump.message.includes("trần") ||
        bump.message.includes("hợp lệ") ||
        bump.message.includes("về 0") ||
        bump.message.includes("Chưa có")
          ? 422
          : 500;
      return NextResponse.json({ error: bump.message }, { status });
    }
    return NextResponse.json({
      ok: true,
      diemUuTien: bump.diemUuTien,
      bumped: bump.bumped,
    });
  }

  const dangBat = Boolean(rec.dangBat);
  const result = await toggleWorldBoost({
    loai,
    id,
    dangBat,
    actorProfileId: gate.profileId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, row: result.row });
}
