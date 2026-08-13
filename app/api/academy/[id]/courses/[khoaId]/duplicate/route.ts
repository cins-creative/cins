import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { nhanBanKhoaHoc } from "@/lib/to-chuc/khoa-hoc";

type RouteContext = { params: Promise<{ id: string; khoaId: string }> };

/** POST /api/co-so/:id/khoa-hoc/:khoaId/nhan-ban — nhân bản khóa + lớp. */
export async function POST(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, khoaId } = await ctx.params;
  const result = await nhanBanKhoaHoc(orgId, khoaId, session.profile.id);
  if (!result.ok) {
    const status = result.error.includes("quyền")
      ? 403
      : result.error.includes("Không tìm thấy")
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, khoaHoc: result.khoaHoc });
}
