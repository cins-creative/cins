import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { listKhieuNaiChoAdmin } from "@/lib/shop/khieu-nai";
import { listPhiKyChoAdmin } from "@/lib/shop/phi";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** GET /api/admin/shop/tranh-chap — khiếu nại mở + kỳ phí chờ xác nhận. */
export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }
  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const [khieuNai, phiKy] = await Promise.all([
      listKhieuNaiChoAdmin(),
      listPhiKyChoAdmin(),
    ]);
    return NextResponse.json({ khieuNai, phiKy });
  } catch (e) {
    console.error("[admin] tranh-chap", e);
    return NextResponse.json({ error: "Không tải." }, { status: 500 });
  }
}
