import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import { setKhoaBoGiaoTrinh } from "@/lib/to-chuc/bo-giao-trinh";

type Ctx = { params: Promise<{ id: string; khoaId: string }> };

/** PATCH /api/co-so/:id/khoa-hoc/:khoaId/bo-giao-trinh — gán bộ cho khóa. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id: orgId, khoaId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "khoa-lop");
  if (quyen !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { boId?: string | null };
  try {
    body = (await req.json()) as { boId?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const boId =
    body.boId == null || body.boId === ""
      ? null
      : String(body.boId).trim();

  try {
    await setKhoaBoGiaoTrinh(orgId, khoaId, boId);
    return NextResponse.json({ ok: true, boId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không gán được bộ giáo trình.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
