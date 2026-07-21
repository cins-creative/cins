import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadSuKienQuanLyOrg } from "@/lib/to-chuc/su-kien-quan-ly-org";

type RouteContext = { params: Promise<{ orgId: string }> };

/** GET — listing sự kiện đang/sắp diễn ra + tổng chờ duyệt (chỉ BTC). */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  const result = await loadSuKienQuanLyOrg(session.profile.id, orgId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data);
}
