import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  updateStudioLifecycle,
  type StudioLifecycleAction,
} from "@/lib/to-chuc/studio-lifecycle";

type RouteContext = { params: Promise<{ id: string }> };

const ACTIONS = new Set<StudioLifecycleAction>(["pause", "resume", "close"]);

/** PATCH /api/studio/:id/lifecycle — tạm dừng / mở lại / đóng cửa (owner). */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: { action?: string; confirmTen?: string };
  try {
    body = (await req.json()) as { action?: string; confirmTen?: string };
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const action = body.action;
  if (!action || !ACTIONS.has(action as StudioLifecycleAction)) {
    return NextResponse.json(
      { error: "Action không hợp lệ (pause | resume | close)." },
      { status: 400 },
    );
  }

  const confirmTen =
    typeof body.confirmTen === "string" ? body.confirmTen : "";
  if (!confirmTen.trim()) {
    return NextResponse.json(
      { error: "Thiếu tên tổ chức để xác nhận." },
      { status: 400 },
    );
  }

  const result = await updateStudioLifecycle({
    orgId,
    actorId: session.profile.id,
    action: action as StudioLifecycleAction,
    confirmTen,
  });

  if (!result.ok) {
    const status = result.error.includes("quyền") || result.error.includes("chủ sở hữu")
      ? 403
      : result.error.includes("Không tìm")
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    trangThaiHoatDong: result.trangThaiHoatDong,
  });
}
