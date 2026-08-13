import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getGioiThieuCooldown,
  recordGioiThieu,
} from "@/lib/shop/gioi-thieu-cooldown";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/shop/nhom/[id]/gioi-thieu — trạng thái giới thiệu (không còn cooldown).
 */
export async function GET(_request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Thiếu id nhóm." }, { status: 422 });
  }

  try {
    const status = await getGioiThieuCooldown(session.profile.id, id.trim());
    return NextResponse.json({
      ...status,
      hint: null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
    }
    return NextResponse.json({ error: "Không tải được." }, { status: 500 });
  }
}

/**
 * POST /api/shop/nhom/[id]/gioi-thieu — ghi mốc sau khi đăng bài giới thiệu.
 * body: { cotMocId: string }
 */
export async function POST(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Thiếu id nhóm." }, { status: 422 });
  }

  let body: { cotMocId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  const cotMocId =
    typeof body.cotMocId === "string" ? body.cotMocId.trim() : "";
  if (!cotMocId) {
    return NextResponse.json({ error: "Thiếu cotMocId." }, { status: 422 });
  }

  try {
    const status = await recordGioiThieu({
      ownerId: session.profile.id,
      nhomId: id.trim(),
      cotMocId,
    });
    return NextResponse.json({
      ...status,
      hint: null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
    }
    return NextResponse.json({ error: "Không lưu được." }, { status: 500 });
  }
}
