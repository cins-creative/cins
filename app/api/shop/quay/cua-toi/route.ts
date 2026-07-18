import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listQuayCuaToi } from "@/lib/shop/quay";

/** GET — quầy đang / đã tham gia của seller đăng nhập. */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const items = await listQuayCuaToi(session.profile.id);
  return NextResponse.json({ items });
}
