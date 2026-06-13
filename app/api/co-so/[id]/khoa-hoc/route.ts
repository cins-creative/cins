import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canViewerManageKhoaHoc,
  listKhoaHocCuaOrg,
  taoKhoaHoc,
} from "@/lib/to-chuc/khoa-hoc";
import type {
  HinhThucLop,
  KhoaHocCheDoHienThi,
  LoaiMoHinhKhoa,
  TaoKhoaHocInput,
  TrinhDoDauVao,
} from "@/lib/to-chuc/khoa-hoc-types";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/co-so/:id/khoa-hoc — danh sách khóa (public). */
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { id: orgId } = await ctx.params;
    const session = await getCurrentSessionAndProfile();
    const includeHidden = session?.profile
      ? await canViewerManageKhoaHoc(session.profile.id, orgId)
      : false;
    const result = await listKhoaHocCuaOrg(orgId, { includeHidden });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ khoaHoc: result.khoaHoc });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tải được danh sách khóa học.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/co-so/:id/khoa-hoc — tạo khóa mới (admin / quản lý nội dung). */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  let body: {
    tenKhoaHoc?: string;
    loaiMoHinh?: LoaiMoHinhKhoa;
    moTa?: string | null;
    thoiLuongBuoi?: number | null;
    thoiLuongPhutMoiBuoi?: number | null;
    hocPhi?: number | null;
    trinhDoDauVao?: TrinhDoDauVao;
    coverId?: string | null;
    thumbnailId?: string | null;
    ngayKhaiGiang?: string | null;
    hinhThuc?: HinhThucLop;
    diaChiHoc?: string | null;
    lichHoc?: string | null;
    yeuCauChuanBi?: string | null;
    cheDoHienThi?: KhoaHocCheDoHienThi;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const input: TaoKhoaHocInput = {
    tenKhoaHoc: body.tenKhoaHoc ?? "",
    loaiMoHinh: body.loaiMoHinh ?? "lien_tuc_theo_thang",
    moTa: body.moTa,
    thoiLuongBuoi: body.thoiLuongBuoi,
    thoiLuongPhutMoiBuoi: body.thoiLuongPhutMoiBuoi,
    hocPhi: body.hocPhi,
    trinhDoDauVao: body.trinhDoDauVao,
    coverId: body.coverId,
    thumbnailId: body.thumbnailId,
    ngayKhaiGiang: body.ngayKhaiGiang,
    hinhThuc: body.hinhThuc,
    diaChiHoc: body.diaChiHoc,
    lichHoc: body.lichHoc,
    yeuCauChuanBi: body.yeuCauChuanBi,
    cheDoHienThi: body.cheDoHienThi,
  };

  const result = await taoKhoaHoc(orgId, session.profile.id, input);
  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, khoaHoc: result.khoaHoc });
}
