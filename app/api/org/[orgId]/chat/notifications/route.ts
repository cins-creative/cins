import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getOrgThongBaoChung,
  setOrgThongBaoChung,
} from "@/lib/chat/org-notify-settings";

type RouteContext = { params: Promise<{ orgId: string }> };

/** GET /api/org/:orgId/chat/thong-bao — cấu hình thông báo dùng chung. */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Thiếu orgId." }, { status: 400 });
  }

  const thongBaoChung = await getOrgThongBaoChung(orgId.trim());
  return NextResponse.json({ thongBaoChung });
}

/** PATCH /api/org/:orgId/chat/thong-bao — body `{ thongBaoChung: boolean }`. */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Thiếu orgId." }, { status: 400 });
  }

  let body: { thongBaoChung?: unknown };
  try {
    body = (await req.json()) as { thongBaoChung?: unknown };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  if (typeof body.thongBaoChung !== "boolean") {
    return NextResponse.json(
      { error: "thiếu thongBaoChung (boolean)." },
      { status: 400 },
    );
  }

  const result = await setOrgThongBaoChung({
    orgId: orgId.trim(),
    actorId: session.profile.id,
    thongBaoChung: body.thongBaoChung,
  });

  if (!result.ok) {
    const status = result.error.includes("Chủ sở hữu") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ thongBaoChung: result.thongBaoChung });
}
