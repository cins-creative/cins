import { NextResponse } from "next/server";

import { tickDongDonShop } from "@/lib/shop/dong-don";
import { xacThucBearerSecret } from "@/lib/noi-bo/xac-thuc-bearer";

export const runtime = "nodejs";

/**
 * POST /api/noi-bo/shop/dong-don
 * Cron/lazy: khảo sát buyer + tự đóng đơn im lặng (P3a).
 * Auth: Bearer `CSDT_PHI_CRON_SECRET` (ưu tiên).
 * Fallback chỉ khi env ưu tiên chưa cấu hình (503) — không khi sai token.
 */
export async function POST(request: Request) {
  let auth = xacThucBearerSecret(request, "CSDT_PHI_CRON_SECRET");
  if (!auth.ok && auth.status === 503) {
    auth = xacThucBearerSecret(request, "CINS_NOI_BO_SHOP_PHI_SECRET");
  }
  if (!auth.ok && auth.status === 503) {
    auth = xacThucBearerSecret(request, "CINS_NOI_BO_DANG_BAI_SECRET");
  }
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const result = await tickDongDonShop();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[noi-bo] shop/dong-don", e);
    return NextResponse.json({ error: "Tick đóng đơn thất bại." }, { status: 500 });
  }
}
