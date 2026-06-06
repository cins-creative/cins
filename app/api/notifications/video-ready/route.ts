import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listVideoReadyNotifications } from "@/lib/social/video-ready";

/* GET /api/notifications/video-ready — thông báo video sẵn sàng (client refresh). */

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  const items = await listVideoReadyNotifications(session.profile.id, {
    unreadOnly: true,
  });
  return NextResponse.json({ items });
}
