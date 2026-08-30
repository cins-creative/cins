import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { prepareVideoUpload } from "@/lib/video/prepare-upload";

/* POST /api/post-video/prepare — tạo slot TUS Cloudflare Stream (?direct_user=true). */

function parseUploadLength(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  let title = "CINS Journey video";
  let uploadLength = 0;
  try {
    const body = (await request.json()) as {
      title?: unknown;
      uploadLength?: unknown;
    };
    if (typeof body.title === "string" && body.title.trim()) {
      title = body.title.trim();
    }
    uploadLength = parseUploadLength(body.uploadLength);
  } catch {
    /* body tuỳ chọn — uploadLength bắt buộc, kiểm bên dưới */
  }

  if (uploadLength <= 0) {
    return NextResponse.json(
      { error: "Thiếu kích thước file video." },
      { status: 400 },
    );
  }

  const result = await prepareVideoUpload(title, uploadLength);
  if (!result.ok) {
    const status = result.error.includes("cấu hình") ? 503 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.data);
}
