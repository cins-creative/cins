import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { kiemTraXoaGhiDanh } from "@/lib/co-so/ghi-danh-xoa";

type RouteContext = { params: Promise<{ id: string; hvlId: string }> };

/** GET /api/co-so/:id/hoc-vien/:hvlId/xoa-preflight */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, hvlId } = await ctx.params;
  const result = await kiemTraXoaGhiDanh(orgId, hvlId, session.profile.id);
  if ("ok" in result && result.ok === false) {
    const status = result.error.includes("quyền") ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
