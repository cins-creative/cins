import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { buildLottieAssetRelativeUrl } from "@/lib/editor/lottie-asset-url";
import {
  buildLottieObjectKey,
  MAX_LOTTIE_FILE_BYTES,
  putLottieObject,
} from "@/lib/cloudflare/r2-lottie";

/**
 * POST /api/post-lottie/upload — upload file .lottie / .json lên Cloudflare R2.
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
    return NextResponse.json(
      { error: "Thiếu file Lottie." },
      { status: 400 },
    );
  }

  const fileName = file.name.trim().toLowerCase();
  const ext = fileName.endsWith(".lottie")
    ? "lottie"
    : fileName.endsWith(".json")
      ? "json"
      : null;
  if (!ext) {
    return NextResponse.json(
      { error: "Chỉ chấp nhận file .lottie hoặc .json." },
      { status: 400 },
    );
  }

  if (file.size > MAX_LOTTIE_FILE_BYTES) {
    return NextResponse.json(
      { error: "File Lottie quá lớn (giới hạn 15MB)." },
      { status: 413 },
    );
  }

  const key = buildLottieObjectKey(session.profile.id, ext);
  const bytes = await file.arrayBuffer();
  const uploaded = await putLottieObject(key, bytes);
  if (!uploaded.ok) {
    return NextResponse.json({ error: uploaded.error }, { status: 502 });
  }

  const url = buildLottieAssetRelativeUrl(key);

  return NextResponse.json({ url, key });
}
