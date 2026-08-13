import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  createGoiHocPhi,
  listGoiHocPhi,
  updateGoiHocPhi,
} from "@/lib/co-so/goi-hoc-phi";
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
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-phi-goi");
  if (quyen === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const goi = await listGoiHocPhi(orgId, { includeHidden: true });
  return NextResponse.json({ goi, canEdit: quyen === "sua" });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if ((await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-phi-goi")) !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    ten?: string;
    soNgay?: number;
    giaVnd?: number;
    moTa?: string | null;
    khoaId?: string | null;
    khoaIds?: string[] | null;
    thuTu?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await createGoiHocPhi({
    orgId,
    ten: body.ten ?? "",
    soNgay: Number(body.soNgay),
    giaVnd: Number(body.giaVnd),
    moTa: body.moTa,
    khoaId: body.khoaId,
    khoaIds: body.khoaIds,
    thuTu: body.thuTu,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ goi: result.goi });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if ((await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-phi-goi")) !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    goiId?: string;
    ten?: string;
    soNgay?: number;
    giaVnd?: number;
    moTa?: string | null;
    dangBan?: boolean;
    thuTu?: number;
    khoaId?: string | null;
    khoaIds?: string[] | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.goiId) {
    return NextResponse.json({ error: "Thiếu goiId." }, { status: 400 });
  }

  const result = await updateGoiHocPhi({
    orgId,
    goiId: body.goiId,
    ten: body.ten,
    soNgay: body.soNgay != null ? Number(body.soNgay) : undefined,
    giaVnd: body.giaVnd != null ? Number(body.giaVnd) : undefined,
    moTa: body.moTa,
    dangBan: body.dangBan,
    thuTu: body.thuTu,
    khoaId: body.khoaId,
    khoaIds: body.khoaIds,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ goi: result.goi });
}
