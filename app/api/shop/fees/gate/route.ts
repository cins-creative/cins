import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getShopPhiGate } from "@/lib/shop/phi-gate";

/**
 * GET /api/shop/phi/gate — trạng thái gate phí shop (nhẹ, cho banner).
 * Chỉ chủ shop (session = seller).
 */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  const sellerId = session?.profile?.id;
  if (!sellerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await getShopPhiGate(sellerId);
  return NextResponse.json({
    trangThai: gate.trangThai,
    tongNoVnd: gate.tongNoVnd,
    hanTraGanNhat: gate.hanTraGanNhat,
    tuKhaiTamMo: gate.tuKhaiTamMo,
    dichVuId: gate.dichVuId,
    sellerId,
  });
}
