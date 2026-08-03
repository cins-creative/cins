import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { kiemTraXoaKhoaHoc } from "@/lib/to-chuc/khoa-lop-xoa";

type RouteContext = { params: Promise<{ id: string; khoaId: string }> };

/** GET /api/co-so/:id/khoa-hoc/:khoaId/xoa-preflight */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, khoaId } = await ctx.params;
  const result = await kiemTraXoaKhoaHoc(orgId, khoaId, session.profile.id);
  if ("ok" in result && result.ok === false) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
