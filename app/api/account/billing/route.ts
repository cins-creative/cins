import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getBillingHubForUser } from "@/lib/billing/hub";

/** GET /api/tai-khoan/thanh-toan — hub billing (owner / phụ trách). */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const hub = await getBillingHubForUser(actorId);
    return NextResponse.json(hub);
  } catch (e) {
    console.error(
      "[billing] hub GET",
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json(
      { error: "Không tải được thanh toán." },
      { status: 500 },
    );
  }
}
