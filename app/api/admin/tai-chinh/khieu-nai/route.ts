import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canGrantAdmin,
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import {
  listKhieuNaiMoAdmin,
  xuLyKhieuNaiAdmin,
} from "@/lib/billing/khieu-nai";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/** GET /api/admin/tai-chinh/khieu-nai — khiếu nại mở / đang xử lý */
export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const items = await listKhieuNaiMoAdmin(50);
  return NextResponse.json({ items, canEdit: canGrantAdmin(role) });
}

/** PATCH — body: { id, trangThai, phanHoiAdmin? } */
export async function PATCH(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  const role = await getCurrentUserSystemRole();
  if (!canGrantAdmin(role)) {
    return NextResponse.json(
      { error: "Chỉ Admin tối cao được xử lý khiếu nại." },
      { status: 403 },
    );
  }
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const trangThai = body.trangThai;
  if (!id) {
    return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  }
  if (
    trangThai !== "dang_xu_ly" &&
    trangThai !== "da_xu_ly" &&
    trangThai !== "tu_choi"
  ) {
    return NextResponse.json({ error: "trangThai không hợp lệ." }, { status: 400 });
  }

  const result = await xuLyKhieuNaiAdmin({
    id,
    actorId,
    trangThai,
    phanHoiAdmin:
      typeof body.phanHoiAdmin === "string" ? body.phanHoiAdmin : null,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ item: result.item });
}
