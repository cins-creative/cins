import { NextResponse } from "next/server";

import {
  getChinhSachPhiPayload,
  type PhiDoiTuong,
} from "@/lib/billing/phi-chinh-sach";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/**
 * GET /api/chinh-sach/phi?doi_tuong=shop|csdt
 * Public — phí đang áp dụng + thông báo đã công bố.
 */
export async function GET(request: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json({ error: "Thiếu service role." }, { status: 503 });
  }

  const url = new URL(request.url);
  const raw = url.searchParams.get("doi_tuong") ?? url.searchParams.get("doiTuong");
  const doiTuong: PhiDoiTuong | null =
    raw === "shop" || raw === "csdt" ? raw : null;
  if (!doiTuong) {
    return NextResponse.json(
      { error: "doi_tuong phải là shop | csdt." },
      { status: 400 },
    );
  }

  const payload = await getChinhSachPhiPayload(doiTuong);
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
