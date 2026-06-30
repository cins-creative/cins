import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createStudioJob, type StudioJobInput } from "@/lib/to-chuc/studio-tuyen-dung-mutations";

/** POST /api/studio/tuyen-dung — tạo tin tuyển dụng (admin org). */
export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: ({ orgId?: string } & StudioJobInput) | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const orgId = body?.orgId?.trim();
  if (!orgId) {
    return NextResponse.json({ error: "Thiếu orgId." }, { status: 400 });
  }

  const result = await createStudioJob(orgId, session.profile.id, {
    tieuDe: body?.tieuDe ?? "",
    moTa: body?.moTa,
    loaiHinh: body?.loaiHinh,
    capDo: body?.capDo,
    tinhThanh: body?.tinhThanh,
    lamTuXa: body?.lamTuXa,
    mucLuongTu: body?.mucLuongTu,
    mucLuongDen: body?.mucLuongDen,
    hienThiLuong: body?.hienThiLuong,
    hanNop: body?.hanNop,
    trangThai: body?.trangThai,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, job: result.job });
}
