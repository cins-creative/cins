import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  fetchBaiTapDisplayMode,
  fetchBaiTapKhoa,
  setBaiTapDisplayMode,
  syncBaiTapKhoa,
} from "@/lib/to-chuc/bai-tap-khoa";
import type {
  BaiTapKhoaData,
  BaiTapSectionDisplayMode,
} from "@/lib/to-chuc/khoa-hoc-types";

type RouteContext = { params: Promise<{ id: string; khoaId: string }> };

/** GET — danh sách bài tập + chế độ hiển thị (public). */
export async function GET(_req: Request, ctx: RouteContext) {
  const { khoaId } = await ctx.params;
  const [baiTap, displayMode] = await Promise.all([
    fetchBaiTapKhoa(khoaId),
    fetchBaiTapDisplayMode(khoaId),
  ]);
  return NextResponse.json({ ok: true, baiTap, displayMode });
}

/** PUT — đồng bộ toàn bộ danh sách bài tập (admin org). */
export async function PUT(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, khoaId } = await ctx.params;
  let body: { baiTap?: BaiTapKhoaData[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const list = Array.isArray(body.baiTap) ? body.baiTap : [];
  const result = await syncBaiTapKhoa(
    orgId,
    khoaId,
    session.profile.id,
    list,
  );
  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, baiTap: result.baiTap });
}

/** PATCH — cập nhật chế độ hiển thị bài tập cho khách. */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, khoaId } = await ctx.params;
  let body: { displayMode?: BaiTapSectionDisplayMode };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  if (
    body.displayMode !== "an" &&
    body.displayMode !== "mot_phan" &&
    body.displayMode !== "day_du"
  ) {
    return NextResponse.json(
      { error: "Chế độ hiển thị không hợp lệ." },
      { status: 400 },
    );
  }

  const result = await setBaiTapDisplayMode(
    orgId,
    khoaId,
    session.profile.id,
    body.displayMode,
  );
  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, displayMode: body.displayMode });
}
