import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  duyetNopBai,
  ganTienDoBai,
  listBaiTapCuaKhoa,
  listNopBaiChoDuyet,
  nopBaiHienTai,
} from "@/lib/co-so/nop-bai";
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
  const quyen = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "khoa-lop");
  if (quyen === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const khoaId = url.searchParams.get("khoaId");
  const choDuyet = await listNopBaiChoDuyet(orgId);
  const baiTap = khoaId ? await listBaiTapCuaKhoa(khoaId) : [];
  return NextResponse.json({
    choDuyet,
    baiTap,
    canDuyet: quyen === "sua",
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: string;
    lopId?: string;
    tinNhanId?: string | null;
    mediaId?: string | null;
    ghiChu?: string | null;
    nopId?: string;
    trangThai?: "dat" | "lam_lai";
    diem?: number | null;
    baiTiepId?: string | null;
    hocVienLopId?: string;
    baiTapId?: string;
    publishThongBao?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "nop") {
    if (!body.lopId) {
      return NextResponse.json({ error: "Thiếu lopId." }, { status: 400 });
    }
    const result = await nopBaiHienTai({
      studentUserId: actorId,
      lopId: body.lopId,
      tinNhanId: body.tinNhanId,
      mediaId: body.mediaId,
      ghiChu: body.ghiChu,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ nopId: result.nopId });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if ((await getCoSoModuleQuyen(orgId, actorId, vaiTro, "khoa-lop")) !== "sua") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.action === "duyet") {
    if (!body.nopId || !body.trangThai) {
      return NextResponse.json(
        { error: "Thiếu nopId/trangThai." },
        { status: 400 },
      );
    }
    const result = await duyetNopBai({
      orgId,
      nopId: body.nopId,
      actorId,
      trangThai: body.trangThai,
      diem: body.diem,
      ghiChu: body.ghiChu,
      baiTiepId: body.baiTiepId,
      publishThongBao: body.publishThongBao,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "gan_tien_do") {
    if (!body.hocVienLopId || !body.baiTapId) {
      return NextResponse.json(
        { error: "Thiếu hocVienLopId/baiTapId." },
        { status: 400 },
      );
    }
    const result = await ganTienDoBai({
      orgId,
      hocVienLopId: body.hocVienLopId,
      baiTapId: body.baiTapId,
      actorId,
      publishThongBao: body.publishThongBao,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action không hợp lệ." }, { status: 400 });
}
