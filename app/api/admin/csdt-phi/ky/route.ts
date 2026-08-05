import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { capNhatSoHoaDonKy } from "@/lib/co-so/phi-admin";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/**
 * PATCH /api/admin/csdt-phi/ky
 * Body: { kyId, soHoaDon }
 */
export async function PATCH(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const kyId = typeof body.kyId === "string" ? body.kyId.trim() : "";
  if (!kyId) {
    return NextResponse.json({ error: "Thiếu kyId." }, { status: 400 });
  }

  const soHoaDon =
    body.soHoaDon === null
      ? null
      : typeof body.soHoaDon === "string"
        ? body.soHoaDon
        : null;

  const result = await capNhatSoHoaDonKy({ kyId, soHoaDon });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
