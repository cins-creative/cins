import { NextResponse } from "next/server";

import { timOrgPortClone } from "@/lib/admin/port-clone";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

export const runtime = "nodejs";

/**
 * GET /api/admin/port-clone/orgs?q= — search org (trường / CSĐT / studio)
 * để clone portfolio vào `org_bai_dang`.
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
      hint: "Nhập ít nhất 2 ký tự (slug hoặc tên org).",
    });
  }

  try {
    const items = await timOrgPortClone(q);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi tìm org.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
