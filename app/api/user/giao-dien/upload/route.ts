import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { prepareImageFileForCloudflareUpload } from "@/lib/cloudflare/prepare-image-upload";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";
import {
  parseProfileGiaoDien,
  prependProfileCustom,
  profileThemeImageUrl,
  serializeGiaoDien,
} from "@/lib/journey/profile-theme";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";
export const maxDuration = 60;

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ POST /api/user/giao-dien/upload                                  ║
   ║ Upload ảnh nền → CF Images, prepend giao_dien.customs (cap 9).   ║
   ║ Không giới hạn cứng 5MB: >10MB nén sharp giống post-image/upload ║
   ║ (≤40MB nguồn; mục tiêu ≤~9.5MB). Không đổi theme.background.     ║
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

  const imageId = result.data.imageId;
  const admin = createServiceRoleClient();
  const profileId = session.profile.id;

  const { data: row, error } = await admin
    .from("user_nguoi_dung")
    .select("giao_dien")
    .eq("id", profileId)
    .maybeSingle<{ giao_dien: unknown }>();

  if (error || !row) {
    return NextResponse.json({ error: "Không tìm thấy hồ sơ." }, { status: 404 });
  }

  const prev = parseProfileGiaoDien(row.giao_dien);
  const next = {
    ...prev,
    customs: prependProfileCustom(prev.customs, imageId),
  };

  const { error: updErr } = await admin
    .from("user_nguoi_dung")
    .update({ giao_dien: serializeGiaoDien(next) })
    .eq("id", profileId);

  if (updErr) {
    console.error("[giao-dien/upload] write err:", updErr);
    return NextResponse.json(
      { error: "Đã tải ảnh nhưng không lưu được vào hồ sơ." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    imageId,
    url: result.data.url,
    thumbUrl: profileThemeImageUrl(imageId, "gridsm") ?? result.data.url,
    customs: next.customs,
    ...(prepared.daNen
      ? {
          daNen: true,
          soByteGoc: prepared.soByteGoc,
          soByteSau: prepared.soByteSau,
        }
      : {}),
  });
}
