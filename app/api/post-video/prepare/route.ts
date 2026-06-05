import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { prepareBunnyVideoUpload } from "@/lib/bunny/stream";

/* POST /api/post-video/prepare — tạo slot video Bunny + chữ ký TUS upload. */

export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  let title = "CINS Journey video";
  try {
    const body = (await request.json()) as { title?: unknown };
    if (typeof body.title === "string" && body.title.trim()) {
      title = body.title.trim();
    }
  } catch {
    /* body tuỳ chọn */
  }

  const result = await prepareBunnyVideoUpload(title);
  if (!result.ok) {
    const status = result.error.includes("cấu hình") ? 503 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.data);
}
