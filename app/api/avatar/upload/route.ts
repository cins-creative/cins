import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ POST /api/avatar/upload                                          ║
   ║                                                                  ║
   ║ Upload avatar đã crop (square ≥ 256×256, ≤ 2MB) lên Cloudflare    ║
   ║ Images. CHỈ owner đã đăng nhập mới upload được — verify session  ║
   ║ trước khi forward file. Trả `imageId` + `url` để client gọi      ║
   ║ server action `updateAvatar(imageId)` lưu vào                    ║
   ║ `user_nguoi_dung.avatar_id`.                                     ║
   ║                                                                  ║
   ║ Note: KHÔNG dùng service-role để upsert DB ở đây — phải qua      ║
   ║ server action có chữ ký rõ ràng + revalidatePath.                ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const MAX_BYTES = 2 * 1024 * 1024;

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
      { error: "Ảnh quá lớn (giới hạn 2MB)." },
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
