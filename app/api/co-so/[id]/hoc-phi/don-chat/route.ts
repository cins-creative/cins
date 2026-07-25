import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createAndSendDonHocPhiChat } from "@/lib/co-so/don-hoc-phi-chat";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if ((await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-vien")) !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    hocVienLopId?: string;
    soNgayCong?: number;
    soTienVnd?: number;
    goiId?: string | null;
    ghiChu?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.hocVienLopId || !body.soNgayCong || body.soTienVnd == null) {
    return NextResponse.json(
      { error: "Thiếu hocVienLopId / soNgayCong / soTienVnd." },
      { status: 400 },
    );
  }

  const result = await createAndSendDonHocPhiChat({
    orgId,
    staffUserId: actorId,
    hocVienLopId: body.hocVienLopId,
    soNgayCong: Number(body.soNgayCong),
    soTienVnd: Number(body.soTienVnd),
    goiId: body.goiId,
    ghiChu: body.ghiChu,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    donId: result.donId,
    roomId: result.roomId,
  });
}
