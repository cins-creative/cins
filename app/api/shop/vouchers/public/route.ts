import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listVoucherCongKhai } from "@/lib/shop/voucher";

/** GET /api/shop/voucher/cong-khai?sellerId= — săn voucher hub / shop. */
export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  const url = new URL(request.url);
  const sellerId = url.searchParams.get("sellerId")?.trim() || null;
  try {
    const items = await listVoucherCongKhai({
      sellerId,
      buyerId: session?.profile?.id ?? null,
      limit: 20,
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "Không tải được voucher công khai." },
      { status: 500 },
    );
  }
}
