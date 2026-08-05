import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { ganGiaoDichVaoKy, timKyTheoMaHoacOrg } from "@/lib/co-so/phi-admin";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/**
 * POST /api/admin/csdt-phi/gan-giao-dich
 * Body: { thanhToanId, kyId } | { search: true, maThamChieu?, orgId? }
 */
export async function POST(request: Request) {
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

  if (body.search === true) {
    const kys = await timKyTheoMaHoacOrg({
      maThamChieu:
        typeof body.maThamChieu === "string" ? body.maThamChieu : null,
      orgId: typeof body.orgId === "string" ? body.orgId : null,
    });
    return NextResponse.json({ kys });
  }

  const thanhToanId =
    typeof body.thanhToanId === "string" ? body.thanhToanId.trim() : "";
  const kyId = typeof body.kyId === "string" ? body.kyId.trim() : "";
  if (!thanhToanId || !kyId) {
    return NextResponse.json(
      { error: "Cần thanhToanId và kyId." },
      { status: 400 },
    );
  }

  const result = await ganGiaoDichVaoKy({ thanhToanId, kyId, actorId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, daTraKy: result.daTraKy });
}
