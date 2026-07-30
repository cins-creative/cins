import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { prepareVideoUpload } from "@/lib/video/prepare-upload";

/* POST /api/post-video/prepare — tạo slot upload video.
   Stream nếu đã cấu hình (uploadURL/tus), ngược lại Bunny (chữ ký TUS). */

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

  const result = await prepareVideoUpload(title);
  if (!result.ok) {
    const status = result.error.includes("cấu hình") ? 503 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.data);
}
