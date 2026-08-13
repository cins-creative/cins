import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getDiemDanhNgay,
  saveDiemDanhNgay,
} from "@/lib/co-so/ops-dashboard";
import { listLopCuaOrg } from "@/lib/co-so/hoc-vien-list";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "diem-danh");
  if (quyen === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const canEdit = quyen === "sua";

  const url = new URL(req.url);
  const lopId = url.searchParams.get("lopId");
  const ngay = url.searchParams.get("ngay") ?? undefined;
  const lop = await listLopCuaOrg(orgId);

  if (!lopId) {
    return NextResponse.json({ lop, canEdit });
  }

  const result = await getDiemDanhNgay({ orgId, lopId, ngay });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    lop,
    ngay: result.ngay,
    rows: result.rows,
    canEdit,
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if ((await getCoSoModuleQuyen(orgId, actorId, vaiTro, "diem-danh")) !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    lopId?: string;
    ngay?: string;
    marks?: Array<{ userId: string; coMat: boolean; ghiChu?: string | null }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.lopId || !body.ngay || !body.marks) {
    return NextResponse.json({ error: "Thiếu lopId/ngay/marks." }, { status: 400 });
  }

  const result = await saveDiemDanhNgay({
    orgId,
    lopId: body.lopId,
    ngay: body.ngay,
    actorId,
    marks: body.marks,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
