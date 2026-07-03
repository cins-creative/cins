import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { updateStudioJob, type StudioJobInput } from "@/lib/to-chuc/studio-tuyen-dung-mutations";
import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/studio/tuyen-dung/:id — sửa / đóng tin tuyển dụng (admin org). */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: StudioJobInput | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await updateStudioJob(id, session.profile.id, {
    tieuDe: body?.tieuDe ?? "",
    moTa: body?.moTa,
    yeuCau: body?.yeuCau,
    quyenLoi: body?.quyenLoi,
    phucLoi: body?.phucLoi,
    moTaNgan: body?.moTaNgan,
    loaiHinh: body?.loaiHinh,
    capDo: body?.capDo,
    tinhThanh: body?.tinhThanh,
    diaChi: body?.diaChi,
    lamTuXa: body?.lamTuXa,
    idLinhVuc: body?.idLinhVuc,
    idNghe: body?.idNghe,
    mucLuongTu: body?.mucLuongTu,
    mucLuongDen: body?.mucLuongDen,
    hienThiLuong: body?.hienThiLuong,
    soLuong: body?.soLuong,
    hanNop: body?.hanNop,
    hienThiCoHoi: body?.hienThiCoHoi,
    giaiDoanMucTieu: body?.giaiDoanMucTieu as GiaiDoan[] | null | undefined,
    trangThai: body?.trangThai,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, job: result.job });
}
