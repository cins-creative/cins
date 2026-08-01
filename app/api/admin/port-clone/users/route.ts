import { NextResponse } from "next/server";

import { timUserThatPortClone } from "@/lib/admin/port-clone";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

export const runtime = "nodejs";

/**
 * GET /api/admin/port-clone/users?q= — search user thật (không gồm nick seeding).
 */
export async function GET(request: Request) {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({
      ok: true,
      items: [],
      hint: "Nhập ít nhất 2 ký tự (slug hoặc tên).",
    });
  }

  try {
    const items = await timUserThatPortClone(q);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi tìm user.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
