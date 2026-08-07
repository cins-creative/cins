import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listDongPhiHoaDon } from "@/lib/billing/dong-phi";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/tai-khoan/thanh-toan/hoa-don/[id]/dong */
export async function GET(_request: Request, ctx: Ctx) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const hoaDonId = id?.trim();
  if (!hoaDonId) {
    return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  }

  const result = await listDongPhiHoaDon({ actorId, hoaDonId });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json(result.data);
}
