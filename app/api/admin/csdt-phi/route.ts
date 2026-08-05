import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  listGiaoDichChuaKhop,
  listKyChoAdmin,
} from "@/lib/co-so/phi-admin";
import {
  listKhieuNaiMoChoAdmin,
  xuLyKhieuNaiAdmin,
  type OrgPhiKhieuNaiTrangThai,
} from "@/lib/co-so/phi-khieu-nai";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** GET /api/admin/csdt-phi — kỳ nợ · GD chưa khớp · khiếu nại mở */
export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [kys, giaoDich, khieuNai] = await Promise.all([
      listKyChoAdmin(),
      listGiaoDichChuaKhop(),
      listKhieuNaiMoChoAdmin(),
    ]);
    return NextResponse.json({ kys, giaoDich, khieuNai });
  } catch (e) {
    console.error("[admin] csdt-phi", e);
    return NextResponse.json({ error: "Không tải." }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/csdt-phi — xử lý khiếu nại.
 * Body: { action: "khieu_nai", knId, trangThai, phanHoi? }
 */
export async function PATCH(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  if (body.action !== "khieu_nai") {
    return NextResponse.json({ error: "action không hỗ trợ." }, { status: 400 });
  }

  const knId = typeof body.knId === "string" ? body.knId : "";
  const trangThai = body.trangThai as OrgPhiKhieuNaiTrangThai;
  if (!knId) {
    return NextResponse.json({ error: "Thiếu knId." }, { status: 400 });
  }

  const result = await xuLyKhieuNaiAdmin({
    knId,
    actorId,
    trangThai,
    phanHoi: typeof body.phanHoi === "string" ? body.phanHoi : null,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ item: result });
}
