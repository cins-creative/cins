import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ POST /api/cover/upload                                           ║
   ║                                                                  ║
   ║ Upload cover (banner sidebar) đã crop (ratio ~3:1, ≤ 5MB) lên    ║
   ║ Cloudflare Images. Auth tương tự /api/avatar/upload. Trả         ║
   ║ `imageId` + `url` để client gọi server action                    ║
   ║ `updateCover(imageId)` lưu `user_nguoi_dung.cover_id`.           ║
   ║                                                                  ║
   ║ Limit 5MB cao hơn avatar (2MB) vì cover ratio rộng → resolution  ║
   ║ thường 1500×500+ trước nén — chấp nhận file gốc nặng hơn.        ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const MAX_BYTES = 5 * 1024 * 1024;

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
      { error: "Ảnh quá lớn (giới hạn 5MB)." },
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
