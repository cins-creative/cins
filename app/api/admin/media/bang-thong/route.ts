import { NextResponse } from "next/server";

import { checkAdminAccess } from "@/lib/admin/require-admin";
import { canAccessAdminPanel, getCurrentUserSystemRole } from "@/lib/auth/system-role";
import { bangThongHint, fetchMediaBangThong } from "@/lib/media/bang-thong";

export async function GET() {
  const gate = checkAdminAccess();
  if (!gate.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const role = await getCurrentUserSystemRole();
  if (!canAccessAdminPanel(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = await fetchMediaBangThong();
  return NextResponse.json({
    ...snapshot,
    hint: bangThongHint(snapshot),
  });
}
