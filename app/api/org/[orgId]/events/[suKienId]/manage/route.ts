import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadSuKienQuanLy } from "@/lib/to-chuc/su-kien-quan-ly";

type RouteContext = {
  params: Promise<{ orgId: string; suKienId: string }>;
};

/** GET — bảng quản lý sự kiện (chỉ BTC). */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId, suKienId } = await ctx.params;
  const result = await loadSuKienQuanLy(session.profile.id, orgId, suKienId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data);
}
