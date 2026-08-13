import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createBaoCao, type BangChungItem } from "@/lib/social/bao-cao";

/** POST /api/bao-cao — người dùng gửi báo cáo nội dung. */
export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập để báo cáo." }, { status: 401 });
  }

  let body: {
    loai_doi_tuong?: string;
    id_doi_tuong?: string;
    loai_bao_cao?: string;
    tieu_de?: string;
    noi_dung?: string;
    bang_chung?: BangChungItem[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  if (!body.id_doi_tuong || !body.loai_bao_cao) {
    return NextResponse.json(
      { error: "Thiếu nội dung hoặc loại báo cáo." },
      { status: 400 },
    );
  }

  const result = await createBaoCao({
    reporterId: session.profile.id,
    loaiDoiTuong: body.loai_doi_tuong,
    idDoiTuong: body.id_doi_tuong,
    loaiBaoCao: body.loai_bao_cao,
    tieuDe: body.tieu_de,
    noiDung: body.noi_dung,
    bangChung: body.bang_chung,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    kenh: result.kenh,
    daTonTai: result.daTonTai,
  });
}
