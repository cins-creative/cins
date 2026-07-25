import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import { listLopHocQuanLy } from "@/lib/to-chuc/lop-hoc-quan-ly";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/co-so/:id/lop-hoc — danh sách lớp toàn org (quản lý). */
export async function GET(_req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "khoa-lop");
  if (quyen === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const lopHoc = await listLopHocQuanLy(orgId);
    return NextResponse.json({
      lopHoc,
      canEdit: quyen === "sua",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tải được danh sách lớp.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
