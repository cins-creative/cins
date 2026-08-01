import { NextResponse } from "next/server";

import { lietKeNickPortClone } from "@/lib/admin/port-clone";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

export const runtime = "nodejs";

/** GET /api/admin/port-clone/nicks — roster cho extension clone portfolio. */
export async function GET() {
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }
  try {
    const items = await lietKeNickPortClone();
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi tải nick.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
