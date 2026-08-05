import { NextResponse } from "next/server";

import { taoMagicLinkMoBai } from "@/lib/admin/port-clone";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

export const runtime = "nodejs";

/**
 * POST /api/admin/port-clone/mo-bai
 * Body: { idTaiKhoan | idNguoiDung | idToChuc, duongDan }
 * → magic link (user/nick) hoặc URL bài ORG.
 */
export async function POST(request: Request) {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  let body: {
    idTaiKhoan?: unknown;
    idNguoiDung?: unknown;
    idToChuc?: unknown;
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
  const idToChuc =
    typeof body.idToChuc === "string" ? body.idToChuc.trim() : "";
  const duongDan =
    typeof body.duongDan === "string" ? body.duongDan.trim() : "";
  const targetCount = [idTaiKhoan, idNguoiDung, idToChuc].filter(Boolean)
    .length;
  if (targetCount === 0 || !duongDan) {
    return NextResponse.json(
      {
        error:
          "Thiếu đích (idTaiKhoan/idNguoiDung/idToChuc) hoặc duongDan.",
      },
      { status: 400 },
    );
  }
  if (targetCount > 1) {
    return NextResponse.json(
      { error: "Chỉ chọn một đích: nick, user, hoặc ORG." },
      { status: 400 },
    );
  }

  try {
    const result = await taoMagicLinkMoBai({
      idTaiKhoan: idTaiKhoan || null,
      idNguoiDung: idNguoiDung || null,
      idToChuc: idToChuc || null,
      duongDan,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi tạo magic link.";
    console.error("[api/admin/port-clone/mo-bai]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
