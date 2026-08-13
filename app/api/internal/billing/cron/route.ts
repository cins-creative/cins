import { NextResponse } from "next/server";

import { chotKyPhiCsdt } from "@/lib/co-so/phi-cron";
import { xacThucBearerSecret } from "@/lib/noi-bo/xac-thuc-bearer";
import { tickDongDonShop } from "@/lib/shop/dong-don";
import { chotKyPhiThang } from "@/lib/shop/phi";

export const runtime = "nodejs";

/**
 * POST /api/noi-bo/billing/cron
 * Cron hợp nhất: CSĐT + shop chốt kỳ + P3a đóng đơn.
 * Auth: Bearer `CSDT_PHI_CRON_SECRET` (ưu tiên).
 * Fallback secret chỉ khi env ưu tiên **chưa cấu hình** (503), không khi sai token (401).
 *
 * Query: `?only=csdt|shop|dong_don` — một nhánh; mặc định cả ba.
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

  const only = new URL(request.url).searchParams.get("only");
  const runAll = only == null || only === "" || only === "both";
  const runCsdt = runAll || only === "csdt";
  const runShop = runAll || only === "shop";
  const runDongDon = runAll || only === "dong_don";

  try {
    const out: Record<string, unknown> = { ok: true };
    if (runCsdt) out.csdt = await chotKyPhiCsdt();
    if (runShop) out.shop = await chotKyPhiThang();
    if (runDongDon) out.dongDon = await tickDongDonShop();
    return NextResponse.json(out);
  } catch (e) {
    console.error("[noi-bo] billing/cron", e);
    return NextResponse.json({ error: "Cron billing thất bại." }, { status: 500 });
  }
}
