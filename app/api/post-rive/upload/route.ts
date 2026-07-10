import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  buildRiveAssetPublicUrl,
  buildRiveObjectKey,
  MAX_RIVE_FILE_BYTES,
  putRiveObject,
} from "@/lib/cloudflare/r2-rive";

/**
 * POST /api/post-rive/upload — upload file .riv lên Cloudflare R2.
 * Trả `{ url, key }` để lưu vào block embed.
 */
export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form không hợp lệ." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Thiếu file .riv." }, { status: 400 });
  }

  const fileName = file.name.trim().toLowerCase();
  if (!fileName.endsWith(".riv")) {
    return NextResponse.json(
      { error: "Chỉ chấp nhận file .riv." },
      { status: 400 },
    );
  }

  if (file.size > MAX_RIVE_FILE_BYTES) {
    return NextResponse.json(
      { error: "File .riv quá lớn (giới hạn 15MB)." },
      { status: 413 },
    );
  }

  const key = buildRiveObjectKey(session.profile.id);
  const bytes = await file.arrayBuffer();
  const uploaded = await putRiveObject(key, bytes, "application/octet-stream");
  if (!uploaded.ok) {
    return NextResponse.json({ error: uploaded.error }, { status: 502 });
  }

  const origin = new URL(request.url).origin;
  const url = buildRiveAssetPublicUrl(key, origin);

  return NextResponse.json({ url, key });
}
