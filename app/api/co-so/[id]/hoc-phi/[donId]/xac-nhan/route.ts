import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { xacNhanDonHocPhi } from "@/lib/co-so/don-hoc-phi";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string; donId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id: orgId, donId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if (
    (await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-phi-doi-soat")) !==
    "sua"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: don } = await admin
    .from("org_don_hoc_phi")
    .select("id, id_to_chuc")
    .eq("id", donId)
    .maybeSingle();
  if (!don || don.id_to_chuc !== orgId) {
    return NextResponse.json({ error: "Không tìm thấy đơn." }, { status: 404 });
  }

  const result = await xacNhanDonHocPhi({ donId, actorId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    kyId: result.kyId,
    ngayDau: result.ngayDau,
    ngayCuoi: result.ngayCuoi,
    joinedPhong: result.joinedPhong,
  });
}
