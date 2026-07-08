import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  listProcessingOrgBaiDangPosts,
  listProcessingVideoItems,
} from "@/lib/journey/video-processing";

/* GET /api/post-video/processing — bài video đang chờ xử lý (Journey + org bài đăng). */

export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  const orgId = new URL(request.url).searchParams.get("orgId")?.trim();
  if (orgId) {
    const items = await listProcessingOrgBaiDangPosts(orgId);
    return NextResponse.json({ items });
  }

  const items = await listProcessingVideoItems(session.profile.id);
  return NextResponse.json({ items });
}
