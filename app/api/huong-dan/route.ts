import { NextResponse } from "next/server";

import { listHuongDanPublic } from "@/lib/huong-dan/huong-dan";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** GET /api/huong-dan — catalog hướng dẫn đã xuất bản (public). */
export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { ok: false, error: "Server chưa cấu hình service role." },
      { status: 503 },
    );
  }
  try {
    const catalog = await listHuongDanPublic();
    return NextResponse.json(
      { ok: true, ...catalog },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
