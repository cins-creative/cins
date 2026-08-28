import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { deleteCloudflareImage } from "@/lib/cloudflare/delete-image";
import {
  parseProfileGiaoDien,
  removeProfileCustomImage,
  serializeGiaoDien,
} from "@/lib/journey/profile-theme";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ DELETE /api/user/giao-dien/custom                                ║
   ║ Body: { imageId } — gỡ khỏi giao_dien.customs + scrub background ║
   ║ rồi xóa ảnh trên Cloudflare Images.                              ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export async function DELETE(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  let body: { imageId?: unknown };
  try {
    body = (await request.json()) as { imageId?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const imageId =
    typeof body.imageId === "string" ? body.imageId.trim() : "";
  if (!imageId) {
    return NextResponse.json({ error: "Thiếu imageId." }, { status: 400 });
  }

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
  if (!prev.customs.some((c) => c.imageId === imageId)) {
    return NextResponse.json(
      { error: "Ảnh không có trong lịch sử tùy chỉnh." },
      { status: 404 },
    );
  }

  const next = removeProfileCustomImage(prev, imageId);

  const { error: updErr } = await admin
    .from("user_nguoi_dung")
    .update({ giao_dien: serializeGiaoDien(next) })
    .eq("id", profileId);

  if (updErr) {
    console.error("[giao-dien/custom] write err:", updErr);
    return NextResponse.json(
      { error: "Không cập nhật được hồ sơ." },
      { status: 500 },
    );
  }

  const cf = await deleteCloudflareImage(imageId);
  if (!cf.ok) {
    console.warn("[giao-dien/custom] CF delete:", cf.error);
  }

  return NextResponse.json({
    ok: true,
    theme: next.theme,
    customs: next.customs,
    cfDeleted: cf.ok,
  });
}
