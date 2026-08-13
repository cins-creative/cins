import { NextResponse } from "next/server";

import { xacThucBearerSecret } from "@/lib/noi-bo/xac-thuc-bearer";
import { runSocialCron } from "@/lib/social/social-cron";

export const runtime = "nodejs";

/**
 * POST /api/noi-bo/social/cron
 * Partition + rollup sự kiện + scrub danh tính ~90 ngày.
 * Auth: Bearer `CSDT_PHI_CRON_SECRET` (cùng billing) — fallback shop secret.
 * Header tuỳ chọn `x-cins-cron-nguon` (worker | github) — ghi log/lease.
 */
export async function POST(request: Request) {
  let auth = xacThucBearerSecret(request, "CSDT_PHI_CRON_SECRET");
  if (!auth.ok && auth.status === 503) {
    auth = xacThucBearerSecret(request, "CINS_NOI_BO_SHOP_PHI_SECRET");
  }
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const nguon =
    request.headers.get("x-cins-cron-nguon")?.trim() || "http";

  try {
    const out = await runSocialCron({ nguon });
    return NextResponse.json(out, { status: out.ok ? 200 : 500 });
  } catch (e) {
    console.error("[noi-bo] social/cron", e);
    return NextResponse.json({ error: "Cron social thất bại." }, { status: 500 });
  }
}
