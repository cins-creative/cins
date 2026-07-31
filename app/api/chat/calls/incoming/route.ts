import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listIncomingCuocGoi } from "@/lib/media/call-history";

/** GET — cuộc gọi đang reo tới user (poll dự phòng khi Realtime trễ). */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  try {
    const calls = await listIncomingCuocGoi(session.profile.id);
    return NextResponse.json({ calls });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Không tải được cuộc gọi đến.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
