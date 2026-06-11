import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchKhoaHocDetail } from "@/lib/to-chuc/khoa-hoc-detail";
import {
  capNhatKhoaHoc,
  xoaKhoaHoc,
} from "@/lib/to-chuc/khoa-hoc";
import type {
  CapNhatKhoaHocInput,
  HinhThucLop,
  LoaiMoHinhKhoa,
  TrinhDoDauVao,
  TrangThaiKhoaHoc,
} from "@/lib/to-chuc/khoa-hoc-types";

type RouteContext = { params: Promise<{ id: string; khoaId: string }> };

/** GET /api/co-so/:id/khoa-hoc/:khoaId — chi tiết khóa (public). */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id: orgId, khoaId } = await ctx.params;
  const result = await fetchKhoaHocDetail(orgId, khoaId);
  if (!result.ok) {
    const status = result.error.includes("Không tìm thấy") ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, detail: result.detail });
}

/** PATCH /api/co-so/:id/khoa-hoc/:khoaId */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, khoaId } = await ctx.params;
  let body: {
    tenKhoaHoc?: string;
    loaiMoHinh?: LoaiMoHinhKhoa;
    moTa?: string | null;
    thoiLuongBuoi?: number | null;
    thoiLuongPhutMoiBuoi?: number | null;
    hocPhi?: number | null;
    trinhDoDauVao?: TrinhDoDauVao;
    coverId?: string | null;
    trangThaiKhoaHoc?: TrangThaiKhoaHoc;
    coverVariant?: number;
    ngayKhaiGiang?: string | null;
    hinhThuc?: HinhThucLop;
    diaChiHoc?: string | null;
    lichHoc?: string | null;
    yeuCauChuanBi?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const input: CapNhatKhoaHocInput = {
    tenKhoaHoc: body.tenKhoaHoc ?? "",
    loaiMoHinh: body.loaiMoHinh ?? "lien_tuc_theo_thang",
    moTa: body.moTa,
    thoiLuongBuoi: body.thoiLuongBuoi,
    thoiLuongPhutMoiBuoi: body.thoiLuongPhutMoiBuoi,
    hocPhi: body.hocPhi,
    trinhDoDauVao: body.trinhDoDauVao,
    coverId: body.coverId,
    trangThaiKhoaHoc: body.trangThaiKhoaHoc,
    ngayKhaiGiang: body.ngayKhaiGiang,
    hinhThuc: body.hinhThuc,
    diaChiHoc: body.diaChiHoc,
    lichHoc: body.lichHoc,
    yeuCauChuanBi: body.yeuCauChuanBi,
  };

  const result = await capNhatKhoaHoc(
    orgId,
    khoaId,
    session.profile.id,
    input,
    body.coverVariant ?? 0,
  );
  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, khoaHoc: result.khoaHoc });
}

/** DELETE /api/co-so/:id/khoa-hoc/:khoaId */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, khoaId } = await ctx.params;
  const result = await xoaKhoaHoc(orgId, khoaId, session.profile.id);
  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
