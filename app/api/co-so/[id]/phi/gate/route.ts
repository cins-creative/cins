import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getCsdtPhiGate } from "@/lib/co-so/phi-gate";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { canAccessCoSoQuanLyAsync } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/co-so/:id/phi/gate — trạng thái gate phí (nhẹ).
 * Mọi staff có quyền vào quan-ly đều đọc được (banner / disable nút).
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const allowed = await canAccessCoSoQuanLyAsync(orgId, actorId, vaiTro);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const gate = await getCsdtPhiGate(orgId);
  return NextResponse.json({
    trangThai: gate.trangThai,
    daKichHoat: gate.daKichHoat,
    tongNoVnd: gate.tongNoVnd,
    hanTraGanNhat: gate.hanTraGanNhat,
    maThamChieu: gate.maThamChieu,
    coStkNhanPhi: gate.coStkNhanPhi,
    phiLuyKeChuaVaoKy: gate.phiLuyKeChuaVaoKy,
    nguongKichHoatVnd: gate.nguongKichHoatVnd,
    tuKhaiTamMo: gate.tuKhaiTamMo,
    tuKhaiDenIso: gate.tuKhaiDenIso,
  });
}
