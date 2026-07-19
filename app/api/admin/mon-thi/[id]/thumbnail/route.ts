import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { persistMonThiCloudflareThumbnail } from "@/lib/admin/mon-thi-thumbnail-persist";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import {
  cloudflareImageTooLargeError,
  MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES,
} from "@/lib/cloudflare/image-upload-limits";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

const MAX_BYTES = MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES;

export async function POST(request: Request, context: RouteContext) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }

  if (!(await getCurrentUserIsCinsAdmin())) {
    return NextResponse.json(
      { error: "Chỉ admin CINs được upload ảnh môn thi." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Thiếu id môn thi." }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form không hợp lệ." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Chọn file ảnh hợp lệ." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: cloudflareImageTooLargeError() },
      { status: 413 },
    );
  }

  const uploaded = await uploadToCloudflareImages(file);
  if (!uploaded.ok) {
    return NextResponse.json({ error: uploaded.error }, { status: 502 });
  }

  const saved = await persistMonThiCloudflareThumbnail(id, uploaded.data);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.message }, { status: 500 });
  }

  revalidatePath("/admin/mon-thi");

  return NextResponse.json({
    ok: true,
    thumbnail_id: saved.thumbnail_id,
    thumbnail_url: saved.thumbnail_url,
  });
}
