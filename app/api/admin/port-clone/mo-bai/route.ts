import { NextResponse } from "next/server";

import { taoMagicLinkMoBai } from "@/lib/admin/port-clone";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

export const runtime = "nodejs";

/**
 * POST /api/admin/port-clone/mo-bai
 * Body: { idTaiKhoan, duongDan } → magic link đăng nhập nick + redirect bài.
 */
export async function POST(request: Request) {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  let body: {
    idTaiKhoan?: unknown;
    idNguoiDung?: unknown;
    duongDan?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const idTaiKhoan =
    typeof body.idTaiKhoan === "string" ? body.idTaiKhoan.trim() : "";
  const idNguoiDung =
    typeof body.idNguoiDung === "string" ? body.idNguoiDung.trim() : "";
  const duongDan =
    typeof body.duongDan === "string" ? body.duongDan.trim() : "";
  if ((!idTaiKhoan && !idNguoiDung) || !duongDan) {
    return NextResponse.json(
      { error: "Thiếu đích (idTaiKhoan/idNguoiDung) hoặc duongDan." },
      { status: 400 },
    );
  }

  try {
    const result = await taoMagicLinkMoBai({
      idTaiKhoan: idTaiKhoan || null,
      idNguoiDung: idNguoiDung || null,
      duongDan,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi tạo magic link.";
    console.error("[api/admin/port-clone/mo-bai]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
