import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createDonTienMat } from "@/lib/co-so/don-hoc-phi";
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
    chiNhanhId?: string | null;
    ghiChu?: string | null;
    autoConfirm?: boolean;
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

  if (itemsFromBody.length > 0 || body.goiId) {
    const items =
      itemsFromBody.length > 0
        ? itemsFromBody
        : [
            {
              hocVienLopId: (body.hocVienLopId ?? "").trim(),
              goiId: (body.goiId ?? "").trim(),
            },
          ];
    if (!items[0]?.hocVienLopId || !items[0]?.goiId) {
      return NextResponse.json(
        { error: "Thiếu hocVienLopId / goiId." },
        { status: 400 },
      );
    }
    const result = await createDonTuGoi({
      orgId,
      staffUserId: actorId,
      items,
      ghiChu: body.ghiChu,
      mode: "tien_mat",
      autoConfirm: body.autoConfirm,
      chiNhanhId: body.chiNhanhId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      donId: result.donIds[0],
      donIds: result.donIds,
      nhomId: result.nhomId,
      maNhom: result.maNhom,
      confirmed: result.confirmed,
      tongVnd: result.tongVnd,
      giamVnd: result.giamVnd,
    });
  }

  if (!body.hocVienLopId || !body.soNgayCong || body.soTienVnd == null) {
    return NextResponse.json(
      { error: "Thiếu hocVienLopId / soNgayCong / soTienVnd (hoặc goiId)." },
      { status: 400 },
    );
  }

  const result = await createDonTienMat({
    orgId,
    hocVienLopId: body.hocVienLopId,
    soNgayCong: Number(body.soNgayCong),
    soTienVnd: Number(body.soTienVnd),
    actorId,
    goiId: null,
    chiNhanhId: body.chiNhanhId,
    ghiChu: body.ghiChu,
    autoConfirm: body.autoConfirm,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    donId: result.donId,
    confirmed: result.confirmed,
  });
}
