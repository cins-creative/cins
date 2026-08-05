import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { prepareImageFileForCloudflareUpload } from "@/lib/cloudflare/prepare-image-upload";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";

export const runtime = "nodejs";
export const maxDuration = 60;

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ POST /api/post-image/upload                                      ║
   ║                                                                  ║
   ║ Upload ảnh inline trong block ảnh của bài viết (Image picker     ║
   ║ trong `EditorView`) lên Cloudflare Images. Trả về `imageId`      ║
   ║ + `url`. Editor lưu `imageId` vào `imgs[]` / `cells[i].seed` —   ║
   ║ render qua `ph()` / `imgSrcForSeed()` (detect UUID → trỏ tới     ║
   ║ `imagedelivery.net`).                                            ║
   ║                                                                  ║
   ║ Ảnh >10MB: nén/resize (sharp) giống port-clone trước khi upload. ║
   ╚══════════════════════════════════════════════════════════════════╝ */

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

  const raw = form.get("file");
  if (!(raw instanceof File) || raw.size === 0) {
    return NextResponse.json({ error: "Thiếu file ảnh." }, { status: 400 });
  }

  const prepared = await prepareImageFileForCloudflareUpload(raw);
  if (!prepared.ok) {
    return NextResponse.json(
      { error: prepared.error },
      { status: prepared.status },
    );
  }

  const result = await uploadToCloudflareImages(prepared.file);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    imageId: result.data.imageId,
    url: result.data.url,
    ...(prepared.daNen
      ? {
          daNen: true,
          soByteGoc: prepared.soByteGoc,
          soByteSau: prepared.soByteSau,
        }
      : {}),
  });
}
