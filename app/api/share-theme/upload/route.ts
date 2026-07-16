import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";
import {
  parseShareOgThemeState,
  prependShareOgCustom,
  serializeShareOgThemeState,
  type ShareOgThemeState,
} from "@/lib/journey/share-og-theme";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ POST /api/share-theme/upload                                     ║
   ║ Upload ảnh nền theme thẻ share / OG (≤ 5MB) + lưu vĩnh viễn vào  ║
   ║ customs (user.theme | org.cau_hinh.share_og_theme). Auth bắt buộc.║
   ║ Form: file (bắt buộc), orgId? (org admin).                       ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const MAX_BYTES = 5 * 1024 * 1024;

function withNewCustom(
  prev: ShareOgThemeState,
  imageId: string,
): ShareOgThemeState {
  const createdAt = new Date().toISOString();
  return {
    ...prev,
    active: { kind: "custom", imageId },
    customs: prependShareOgCustom(prev.customs, imageId, createdAt),
  };
}

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

  const orgId =
    typeof form.get("orgId") === "string"
      ? String(form.get("orgId")).trim()
      : "";

  const result = await uploadToCloudflareImages(file);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const imageId = result.data.imageId;
  const admin = createServiceRoleClient();

  if (orgId) {
    if (!(await isTruongOrgAdmin(orgId, session.profile.id))) {
      return NextResponse.json(
        { error: "Bạn không có quyền đổi theme tổ chức này." },
        { status: 403 },
      );
    }

    const { data: org, error } = await admin
      .from("org_to_chuc")
      .select("id, slug, cau_hinh")
      .eq("id", orgId)
      .maybeSingle<{
        id: string;
        slug: string;
        cau_hinh: Record<string, unknown> | null;
      }>();

    if (error || !org) {
      return NextResponse.json({ error: "Không tìm thấy tổ chức." }, { status: 404 });
    }

    const prev = parseShareOgThemeState(
      org.cau_hinh?.share_og_theme ?? null,
      org.slug,
    );
    const next = withNewCustom(prev, imageId);
    const cauHinh = {
      ...(org.cau_hinh && typeof org.cau_hinh === "object" ? org.cau_hinh : {}),
      share_og_theme: {
        active: next.active,
        customs: next.customs,
        layouts: next.layouts,
      },
    };

    const { error: updErr } = await admin
      .from("org_to_chuc")
      .update({ cau_hinh: cauHinh })
      .eq("id", orgId);

    if (updErr) {
      return NextResponse.json(
        { error: "Đã tải ảnh nhưng không lưu được vào hồ sơ." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      imageId,
      url: result.data.url,
      state: next,
    });
  }

  const profileId = session.profile.id;
  const { data: user, error } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, theme")
    .eq("id", profileId)
    .maybeSingle<{ id: string; slug: string; theme: string | null }>();

  if (error || !user) {
    return NextResponse.json({ error: "Không tìm thấy hồ sơ." }, { status: 404 });
  }

  const prev = parseShareOgThemeState(user.theme, user.slug);
  const next = withNewCustom(prev, imageId);

  const { error: updErr } = await admin
    .from("user_nguoi_dung")
    .update({ theme: serializeShareOgThemeState(next) })
    .eq("id", profileId);

  if (updErr) {
    return NextResponse.json(
      { error: "Đã tải ảnh nhưng không lưu được vào hồ sơ." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    imageId,
    url: result.data.url,
    state: next,
  });
}
