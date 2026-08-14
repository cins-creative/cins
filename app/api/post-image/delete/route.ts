import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { deleteCloudflareImage } from "@/lib/cloudflare/delete-image";
import { isCfImageUuid } from "@/lib/truong/image-ref";

export const runtime = "nodejs";

/** POST /api/post-image/delete — xóa ảnh CF (ô bảng / thay ảnh). Cần đăng nhập. */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  let body: { imageId?: unknown };
  try {
    body = (await request.json()) as { imageId?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const imageId =
    typeof body.imageId === "string" ? body.imageId.trim() : "";
  if (!isCfImageUuid(imageId)) {
    return NextResponse.json({ error: "imageId không hợp lệ." }, { status: 400 });
  }

  const result = await deleteCloudflareImage(imageId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
