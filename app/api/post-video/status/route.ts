import { NextResponse } from "next/server";

import { getBunnyVideoStatus } from "@/lib/bunny/stream";

/* GET /api/post-video/status?videoId= — trạng thái encode Bunny Stream (public read). */

export async function GET(request: Request) {
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
