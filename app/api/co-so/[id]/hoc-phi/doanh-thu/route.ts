import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listDonChoThanhToan, listDonDaDoiSoat } from "@/lib/co-so/don-hoc-phi-chat";
import { getDoanhThuSummary } from "@/lib/co-so/ops-dashboard";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(
    orgId,
    actorId,
    vaiTro,
    "hoc-phi-doi-soat",
  );
  if (quyen === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const canView = quyen !== "an";

  const [summary, cho, daDoiSoat] = await Promise.all([
    getDoanhThuSummary(orgId),
    canView ? listDonChoThanhToan(orgId) : Promise.resolve([]),
    canView ? listDonDaDoiSoat(orgId) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    summary,
    choThanhToan: cho,
    daDoiSoat,
  });
}
