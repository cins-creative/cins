import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  createChiNhanh,
  listChiNhanh,
  updateChiNhanh,
} from "@/lib/co-so/ops-dashboard";
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
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "chi-nhanh");
  if (quyen === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await listChiNhanh(orgId);
  return NextResponse.json({ rows, canEdit: quyen === "sua" });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if ((await getCoSoModuleQuyen(orgId, actorId, vaiTro, "chi-nhanh")) !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: {
    ten?: string;
    diaChi?: string | null;
    tinhThanh?: string | null;
    dienThoai?: string | null;
    email?: string | null;
    coverId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const result = await createChiNhanh({
    orgId,
    ten: body.ten ?? "",
    diaChi: body.diaChi,
    tinhThanh: body.tinhThanh,
    dienThoai: body.dienThoai,
    email: body.email,
    coverId: body.coverId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ row: result.row });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if ((await getCoSoModuleQuyen(orgId, actorId, vaiTro, "chi-nhanh")) !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: {
    id?: string;
    ten?: string;
    diaChi?: string | null;
    tinhThanh?: string | null;
    dienThoai?: string | null;
    email?: string | null;
    coverId?: string | null;
    dangHoatDong?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  }
  const result = await updateChiNhanh({
    orgId,
    id: body.id,
    ten: body.ten,
    diaChi: body.diaChi,
    tinhThanh: body.tinhThanh,
    dienThoai: body.dienThoai,
    email: body.email,
    coverId: body.coverId,
    dangHoatDong: body.dangHoatDong,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ row: result.row });
}
