import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { capNhatLopHoc } from "@/lib/to-chuc/lop-hoc";
import type {
  HinhThucLop,
  LopHocFormInput,
  TrangThaiLop,
} from "@/lib/to-chuc/khoa-hoc-types";

type RouteContext = {
  params: Promise<{ id: string; khoaId: string; lopId: string }>;
};

/** PATCH /api/co-so/:id/khoa-hoc/:khoaId/lop/:lopId — cập nhật lớp học. */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, khoaId, lopId } = await ctx.params;
  let body: {
    maLop?: string | null;
    hinhThuc?: HinhThucLop;
    lichHoc?: string | null;
    ngayKhaiGiang?: string | null;
    giaoVienText?: string | null;
    slotToiDa?: number | null;
    trangThaiLop?: TrangThaiLop;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const input: LopHocFormInput = {
    maLop: body.maLop,
    hinhThuc: body.hinhThuc,
    lichHoc: body.lichHoc,
    ngayKhaiGiang: body.ngayKhaiGiang,
    giaoVienText: body.giaoVienText,
    slotToiDa: body.slotToiDa,
    trangThaiLop: body.trangThaiLop,
  };

  const result = await capNhatLopHoc(
    orgId,
    khoaId,
    lopId,
    session.profile.id,
    input,
  );
  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
