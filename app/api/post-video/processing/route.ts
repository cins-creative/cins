import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listProcessingVideoPosts } from "@/lib/journey/video-processing";

/* GET /api/post-video/processing — bài video đang chờ xử lý của user hiện tại. */

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  const items = await listProcessingVideoPosts(session.profile.id);
  return NextResponse.json({ items });
}
