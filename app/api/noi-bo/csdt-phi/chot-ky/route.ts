import { NextResponse } from "next/server";

import { chotKyPhiCsdt } from "@/lib/co-so/phi-cron";
import { xacThucBearerSecret } from "@/lib/noi-bo/xac-thuc-bearer";

export const runtime = "nodejs";

const ENV_SECRET = "CSDT_PHI_CRON_SECRET";

/**
 * POST /api/noi-bo/csdt-phi/chot-ky
 * Cron: ensure kỳ kích hoạt/tháng + cập nhật quá hạn + thông báo founders.
 * Auth: Bearer `CSDT_PHI_CRON_SECRET` (Workers cron cấu hình sau — O21).
 * Plan ghi `internal/csdt-phi/chot-ky`; đặt dưới `noi-bo/` cùng mẫu shop.
 */
export async function POST(request: Request) {
  const auth = xacThucBearerSecret(request, ENV_SECRET);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const result = await chotKyPhiCsdt();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[noi-bo] csdt-phi/chot-ky", e);
    return NextResponse.json({ error: "Chốt kỳ thất bại." }, { status: 500 });
  }
}
