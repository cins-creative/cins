import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { deleteCloudflareImage } from "@/lib/cloudflare/delete-image";
import { uploadToCloudflareImages } from "@/lib/cloudflare/upload-image";
import { deleteUnreferencedShareImage } from "@/lib/journey/share-link";
import {
  isGalleryShareLayout,
  isJourneyShareLayout,
  parseShareOgThemeState,
  serializeShareOgThemeState,
  shareOgThemeStatePayload,
  upsertShareOgSnapshot,
  type ShareOgThemeState,
} from "@/lib/journey/share-og-theme";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ POST /api/share-theme/og-card                                    ║
   ║ Upload PNG thẻ share (html-to-image) → CF Images + ghi          ║
   ║ theme.ogSnapshots[key]. Auth: chủ hồ sơ / admin org.             ║
   ║ Form: file (PNG), key (buildShareOgSnapshotKey), orgId?          ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const MAX_BYTES = 8 * 1024 * 1024;

const SNAPSHOT_KEY_RE =
  /^(journey|gallery)\|[a-zA-Z0-9_-]{1,40}\|[a-zA-Z0-9_-]{1,24}\|[pc][a-zA-Z0-9_-]{1,40}$/;

function applyLayoutFromKey(
  state: ShareOgThemeState,
  key: string,
): ShareOgThemeState {
  const [kind, , layout] = key.split("|");
  if (kind === "gallery" && isGalleryShareLayout(layout)) {
    return {
      ...state,
      layouts: { ...state.layouts, gallery: layout },
    };
  }
  if (kind === "journey" && isJourneyShareLayout(layout)) {
    return {
      ...state,
      layouts: { ...state.layouts, journey: layout },
    };
  }
  return state;
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
      { error: "Ảnh quá lớn (giới hạn 8MB)." },
      { status: 413 },
    );
  }

  const keyRaw = typeof form.get("key") === "string" ? String(form.get("key")) : "";
  const key = keyRaw.trim().slice(0, 120);
  if (!key || !SNAPSHOT_KEY_RE.test(key)) {
    return NextResponse.json({ error: "Key snapshot không hợp lệ." }, { status: 400 });
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
      void deleteCloudflareImage(imageId);
      return NextResponse.json(
        { error: "Bạn không có quyền cập nhật thẻ tổ chức này." },
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
      void deleteCloudflareImage(imageId);
      return NextResponse.json({ error: "Không tìm thấy tổ chức." }, { status: 404 });
    }

    const prev = applyLayoutFromKey(
      parseShareOgThemeState(org.cau_hinh?.share_og_theme ?? null, org.slug),
      key,
    );
    const { state: next, replacedImageId, prunedIds } = upsertShareOgSnapshot(
      prev,
      key,
      imageId,
    );

    const cauHinh = {
      ...(org.cau_hinh && typeof org.cau_hinh === "object" ? org.cau_hinh : {}),
      share_og_theme: shareOgThemeStatePayload(next),
    };

    const { error: updErr } = await admin
      .from("org_to_chuc")
      .update({ cau_hinh: cauHinh })
      .eq("id", orgId);

    if (updErr) {
      void deleteCloudflareImage(imageId);
      return NextResponse.json(
        { error: "Đã tải ảnh nhưng không lưu được vào hồ sơ." },
        { status: 500 },
      );
    }

    if (replacedImageId) void deleteUnreferencedShareImage(replacedImageId);
    for (const id of prunedIds) void deleteUnreferencedShareImage(id);

    revalidatePath(`/${org.slug}`);
    revalidatePath(`/${org.slug}/journey`);

    return NextResponse.json({
      imageId,
      url: result.data.url,
      key,
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
    void deleteCloudflareImage(imageId);
    return NextResponse.json({ error: "Không tìm thấy hồ sơ." }, { status: 404 });
  }

  const prev = applyLayoutFromKey(
    parseShareOgThemeState(user.theme, user.slug),
    key,
  );
  const { state: next, replacedImageId, prunedIds } = upsertShareOgSnapshot(
    prev,
    key,
    imageId,
  );

  const { error: updErr } = await admin
    .from("user_nguoi_dung")
    .update({ theme: serializeShareOgThemeState(next) })
    .eq("id", profileId);

  if (updErr) {
    void deleteCloudflareImage(imageId);
    return NextResponse.json(
      { error: "Đã tải ảnh nhưng không lưu được vào hồ sơ." },
      { status: 500 },
    );
  }

  if (replacedImageId) void deleteUnreferencedShareImage(replacedImageId);
  for (const id of prunedIds) void deleteUnreferencedShareImage(id);

  revalidatePath(`/${user.slug}`);
  revalidatePath(`/${user.slug}/journey`);

  return NextResponse.json({
    imageId,
    url: result.data.url,
    key,
    state: next,
  });
}
