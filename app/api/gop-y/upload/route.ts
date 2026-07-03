import { NextResponse } from "next/server";

import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";

/**
 * POST /api/gop-y/upload — upload 1 ảnh minh họa cho góp ý (public, khách cũng
 * gửi được như chính form góp ý). Dán ảnh từ clipboard hoặc chọn từ máy.
 * Trả về `{ url }` (imagedelivery.net) để lưu vào `anh_url`.
 *
 * Giới hạn 8MB — khớp `uploadToCloudflareImages`.
 */
const MAX_BYTES = 8 * 1024 * 1024;

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
      { error: "Ảnh quá lớn (giới hạn 8MB)." },
      { status: 413 },
    );
  }

  const result = await uploadToCloudflareImages(file);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ url: result.data.url });
}
