import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { xoaGhiDanh } from "@/lib/co-so/ghi-danh-xoa";
import { updateHocVienTrangThaiManual } from "@/lib/co-so/hoc-vien-list";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";

type RouteContext = { params: Promise<{ id: string; hvlId: string }> };

/** DELETE /api/co-so/:id/hoc-vien/:hvlId — gỡ ghi danh vĩnh viễn, có guard. */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, hvlId } = await ctx.params;
  const result = await xoaGhiDanh(orgId, hvlId, session.profile.id);
  if (!result.ok) {
    const body: Record<string, unknown> = { error: result.error };
    if ("blockers" in result) {
      body.blockers = result.blockers;
      body.canhBao = result.canhBao;
    }
    return NextResponse.json(body, { status: result.status ?? 400 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/co-so/:id/hoc-vien/:hvlId
 * Gán thủ công Nghỉ (`action: "nghi"`) hoặc bỏ Nghỉ (`action: "bo_nghi"`).
 * Đang học / Hết kỳ học — tự động theo xác nhận HP + ngày kỳ.
 */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, hvlId } = await ctx.params;
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if ((await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-vien")) !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action?.trim();
  if (action !== "nghi" && action !== "bo_nghi") {
    return NextResponse.json(
      { error: "action phải là nghi hoặc bo_nghi." },
      { status: 400 },
    );
  }

  const result = await updateHocVienTrangThaiManual(orgId, hvlId, action);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, trangThai: result.trangThai });
}
