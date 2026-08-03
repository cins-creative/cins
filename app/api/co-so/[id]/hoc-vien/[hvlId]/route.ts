import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { xoaGhiDanh } from "@/lib/co-so/ghi-danh-xoa";

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
