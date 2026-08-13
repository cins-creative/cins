import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadSuKienQuanLyThanhVien } from "@/lib/to-chuc/su-kien-quan-ly";

type RouteContext = {
  params: Promise<{ orgId: string; suKienId: string }>;
};

/** GET — danh sách đăng ký tham gia / quan tâm (lazy, chỉ BTC). */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId, suKienId } = await ctx.params;
  const result = await loadSuKienQuanLyThanhVien(
    session.profile.id,
    orgId,
    suKienId,
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ thanhVien: result.thanhVien });
}
