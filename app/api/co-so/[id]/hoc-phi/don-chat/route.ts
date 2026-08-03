import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createAndSendDonHocPhiChat } from "@/lib/co-so/don-hoc-phi-chat";
import { createDonTuGoi } from "@/lib/co-so/don-nhom";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string }> };

type ItemBody = { hocVienLopId?: string; goiId?: string };

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
    items?: ItemBody[];
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

  const itemsFromBody = (body.items ?? [])
    .map((it) => ({
      hocVienLopId: (it.hocVienLopId ?? "").trim(),
      goiId: (it.goiId ?? "").trim(),
    }))
    .filter((it) => it.hocVienLopId && it.goiId);

  if (itemsFromBody.length > 0) {
    const result = await createDonTuGoi({
      orgId,
      staffUserId: actorId,
      items: itemsFromBody,
      ghiChu: body.ghiChu,
      mode: "chat",
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      donId: result.donIds[0],
      donIds: result.donIds,
      nhomId: result.nhomId,
      maNhom: result.maNhom,
      roomId: result.roomId,
      tongVnd: result.tongVnd,
      giamVnd: result.giamVnd,
    });
  }

  if (!body.hocVienLopId) {
    return NextResponse.json(
      { error: "Thiếu hocVienLopId hoặc items." },
      { status: 400 },
    );
  }

  // Legacy single: có goiId → giá server; không → giữ soTienVnd (tuỳ chỉnh).
  if (body.goiId) {
    const result = await createDonTuGoi({
      orgId,
      staffUserId: actorId,
      items: [{ hocVienLopId: body.hocVienLopId, goiId: body.goiId }],
      ghiChu: body.ghiChu,
      mode: "chat",
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      donId: result.donIds[0],
      donIds: result.donIds,
      nhomId: result.nhomId,
      maNhom: result.maNhom,
      roomId: result.roomId,
      tongVnd: result.tongVnd,
      giamVnd: result.giamVnd,
    });
  }

  if (!body.soNgayCong || body.soTienVnd == null) {
    return NextResponse.json(
      { error: "Thiếu soNgayCong / soTienVnd (hoặc chọn goiId)." },
      { status: 400 },
    );
  }

  const result = await createAndSendDonHocPhiChat({
    orgId,
    staffUserId: actorId,
    hocVienLopId: body.hocVienLopId,
    soNgayCong: Number(body.soNgayCong),
    soTienVnd: Number(body.soTienVnd),
    goiId: null,
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
