import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ POST /api/post-image/upload                                      ║
   ║                                                                  ║
   ║ Upload ảnh inline trong block ảnh của bài viết (Image picker     ║
   ║ trong `EditorView`) lên Cloudflare Images. Trả về `imageId`      ║
   ║ + `url`. Editor lưu `imageId` vào `imgs[]` / `cells[i].seed` —   ║
   ║ render qua `ph()` / `imgSrcForSeed()` (detect UUID → trỏ tới     ║
   ║ `imagedelivery.net`).                                            ║
   ║                                                                  ║
   ║ Limit 8MB — khớp `uploadToCloudflareImages` MAX_BYTES (8MB).     ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const MAX_BYTES = 8 * 1024 * 1024;

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

  return NextResponse.json({
    imageId: result.data.imageId,
    url: result.data.url,
  });
}
