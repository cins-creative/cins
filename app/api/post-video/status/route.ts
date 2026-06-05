import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getBunnyVideoStatus } from "@/lib/bunny/stream";

/* GET /api/post-video/status?videoId= — trạng thái encode Bunny Stream. */

export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  const videoId = new URL(request.url).searchParams.get("videoId")?.trim();
  if (!videoId) {
    return NextResponse.json({ error: "Thiếu videoId." }, { status: 400 });
  }

  const result = await getBunnyVideoStatus(videoId);
  if (!result.ok) {
    const status = result.error.includes("cấu hình") ? 503 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ready: result.ready, status: result.status });
}
