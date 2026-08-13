import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { tuKhaiDaTraKy } from "@/lib/co-so/phi-sepay";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { isCoSoFounderTier } from "@/lib/to-chuc/co-so-quan-ly-access";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/co-so/:id/phi/tu-khai-da-tra
 * Founder tự khai đã chuyển khoản → mở rào tạm 3 ngày (P0 C5).
 * Body: { kyId: string }
 */
export async function POST(request: Request, ctx: Ctx) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if (!isCoSoFounderTier(vaiTro)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const kyId = typeof body.kyId === "string" ? body.kyId.trim() : "";
  if (!kyId) {
    return NextResponse.json({ error: "Thiếu kyId." }, { status: 400 });
  }

  const result = await tuKhaiDaTraKy({ orgId, kyId, actorId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    anHanDen: result.anHanDen,
  });
}
