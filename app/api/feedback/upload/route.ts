import { NextResponse } from "next/server";

import {
  cloudflareImageTooLargeError,
  MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES,
} from "@/lib/cloudflare/image-upload-limits";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";

/**
 * POST /api/gop-y/upload — upload 1 ảnh minh họa cho góp ý (public, khách cũng
 * gửi được như chính form góp ý). Dán ảnh từ clipboard hoặc chọn từ máy.
 * Trả về `{ url }` (imagedelivery.net) để lưu vào `anh_url`.
 *
 * Giới hạn = MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES (trần CF Images).
 */
const MAX_BYTES = MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form không hợp lệ." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Thiếu file ảnh." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: cloudflareImageTooLargeError() },
      { status: 413 },
    );
  }

  const result = await uploadToCloudflareImages(file);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ url: result.data.url });
}
