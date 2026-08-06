import { NextResponse } from "next/server";

import { getVideoStatus } from "@/lib/video/status";

/* GET /api/post-video/status?videoId=&provider= — trạng thái encode Cloudflare Stream. */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const videoId = url.searchParams.get("videoId")?.trim();
  const provider = url.searchParams.get("provider")?.trim() || null;
  if (!videoId) {
    return NextResponse.json({ error: "Thiếu videoId." }, { status: 400 });
  }

  const result = await getVideoStatus(videoId, provider);
  if (!result.ok) {
    const status = result.error.includes("cấu hình") ? 503 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ready: result.ready, status: result.status });
}
