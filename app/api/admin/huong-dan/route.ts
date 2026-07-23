import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { listHuongDanForAdmin } from "@/lib/huong-dan/huong-dan";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** GET /api/admin/huong-dan — catalog đầy đủ cho admin panel. */
export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { ok: false, error: "Thiếu service role." },
      { status: 503 },
    );
  }
  const isAdmin = await getCurrentUserIsCinsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  try {
    const nhom = await listHuongDanForAdmin();
    return NextResponse.json({ ok: true, nhom });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
