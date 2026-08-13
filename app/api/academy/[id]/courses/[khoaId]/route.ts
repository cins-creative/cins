import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchKhoaHocDetail } from "@/lib/to-chuc/khoa-hoc-detail";
import {
  canViewerManageKhoaHoc,
  capNhatKhoaHoc,
  xoaKhoaHoc,
} from "@/lib/to-chuc/khoa-hoc";
import type {
  CapNhatKhoaHocInput,
  GoiHocPhiKhoa,
  KhoaHocCheDoHienThi,
  LoaiMoHinhKhoa,
  TrinhDoDauVao,
  TrangThaiKhoaHoc,
} from "@/lib/to-chuc/khoa-hoc-types";

type RouteContext = { params: Promise<{ id: string; khoaId: string }> };

/** GET /api/co-so/:id/khoa-hoc/:khoaId — chi tiết khóa (public). */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id: orgId, khoaId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const includeHidden = session?.profile
    ? await canViewerManageKhoaHoc(session.profile.id, orgId)
    : false;
  const result = await fetchKhoaHocDetail(orgId, khoaId, { includeHidden });
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
    maKhoaHoc?: string | null;
    slug?: string | null;
    loaiMoHinh?: LoaiMoHinhKhoa;
    moTa?: string | null;
    thoiLuongBuoi?: number | null;
    thoiLuongPhutMoiBuoi?: number | null;
    hocPhi?: number | null;
    goiHocPhi?: GoiHocPhiKhoa[];
    trinhDoDauVao?: TrinhDoDauVao;
    coverId?: string | null;
    thumbnailId?: string | null;
    trangThaiKhoaHoc?: TrangThaiKhoaHoc;
    coverVariant?: number;
    yeuCauChuanBi?: string | null;
    cheDoHienThi?: KhoaHocCheDoHienThi;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const input: CapNhatKhoaHocInput = {
    tenKhoaHoc: body.tenKhoaHoc ?? "",
    maKhoaHoc: body.maKhoaHoc,
    slug: body.slug,
    loaiMoHinh: body.loaiMoHinh ?? "lien_tuc_theo_thang",
    moTa: body.moTa,
    thoiLuongBuoi: body.thoiLuongBuoi,
    thoiLuongPhutMoiBuoi: body.thoiLuongPhutMoiBuoi,
    hocPhi: body.hocPhi,
    goiHocPhi: body.goiHocPhi,
    trinhDoDauVao: body.trinhDoDauVao,
    coverId: body.coverId,
    thumbnailId: body.thumbnailId,
    trangThaiKhoaHoc: body.trangThaiKhoaHoc,
    yeuCauChuanBi: body.yeuCauChuanBi,
    cheDoHienThi: body.cheDoHienThi,
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

/** DELETE /api/co-so/:id/khoa-hoc/:khoaId — hard delete (guard). Soft → PATCH trangThaiKhoaHoc. */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, khoaId } = await ctx.params;
  const result = await xoaKhoaHoc(orgId, khoaId, session.profile.id);
  if (!result.ok) {
    if ("blockers" in result && result.blockers) {
      return NextResponse.json(
        {
          error: result.error,
          blockers: result.blockers,
          canhBao: result.canhBao ?? [],
          coTheXoa: false,
        },
        { status: 409 },
      );
    }
    const status =
      result.status ?? (result.error.includes("quyền") ? 403 : 400);
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
