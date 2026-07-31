import { NextResponse } from "next/server";

import { xacThucBearerSecret } from "@/lib/noi-bo/xac-thuc-bearer";
import { chotKyPhiThang } from "@/lib/shop/phi";

export const runtime = "nodejs";

const ENV_SECRET = "CINS_NOI_BO_SHOP_PHI_SECRET";

/**
 * POST /api/noi-bo/shop/chot-ky-phi
 * Cron đầu tháng: chốt kỳ trước + đánh dấu quá hạn + cập nhật gate.
 * Auth: Bearer `CINS_NOI_BO_SHOP_PHI_SECRET` (fallback cũng chấp nhận CINS_NOI_BO_DANG_BAI_SECRET nếu chưa tách).
 */
export async function POST(request: Request) {
  let auth = xacThucBearerSecret(request, ENV_SECRET);
  if (!auth.ok && auth.status === 503) {
    auth = xacThucBearerSecret(request, "CINS_NOI_BO_DANG_BAI_SECRET");
  }
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const result = await chotKyPhiThang();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[noi-bo] chot-ky-phi", e);
    return NextResponse.json({ error: "Chốt kỳ thất bại." }, { status: 500 });
  }
}
