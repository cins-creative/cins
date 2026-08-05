import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listQuayHangSearch } from "@/lib/shop/quay";
import type { ShopQuayHangSearch } from "@/lib/shop/types";

type Ctx = { params: Promise<{ suKienId: string }> };

/**
 * GET /api/su-kien/:suKienId/quay/hang
 * Catalog hàng theo seller — lazy khi user mở chế độ «Hàng».
 */
export async function GET(_request: Request, ctx: Ctx) {
  const { suKienId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const bySeller = await listQuayHangSearch(suKienId, {
    actorId: session?.profile?.id,
  });

  const payload: Record<string, ShopQuayHangSearch[]> = {};
  for (const [sellerId, cards] of bySeller) {
    payload[sellerId] = cards;
  }
  return NextResponse.json({ bySeller: payload });
}
