import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { deleteCloudflareImage } from "@/lib/cloudflare/delete-image";
import {
  mergeShareOgCustoms,
  parseShareOgThemeState,
  prependShareOgCustom,
  serializeShareOgThemeState,
  shareOgThemeStatePayload,
  type ShareOgCustomEntry,
  type ShareOgLayouts,
  type ShareOgTheme,
  type ShareOgThemeState,
} from "@/lib/journey/share-og-theme";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ GET  /api/share-theme?slug=… | ?orgId=…                          ║
   ║ PATCH /api/share-theme — lưu theme (user.theme | org.cau_hinh)   ║
   ║                                                                  ║
   ║ User: cột text `user_nguoi_dung.theme` (JSON string).            ║
   ║ Org:  `org_to_chuc.cau_hinh.share_og_theme`.                     ║
   ║ Shape: { active, customs, layouts, ogSnapshots? }.               ║
   ║ customs = nền cá nhân vĩnh viễn (chỉ mất khi removeImageId).     ║
   ║ ogSnapshots = PNG thẻ đã publish (CF) cho og:image.              ║
   ║ Chỉ chủ profile / admin org được PATCH.                          ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type PatchBody = {
  orgId?: string;
  active?: ShareOgTheme;
  customs?: ShareOgCustomEntry[];
  layouts?: ShareOgLayouts;
  /** Xóa một custom imageId khỏi list (+ CF best-effort). */
  removeImageId?: string;
};

function normalizeState(
  active: ShareOgTheme | undefined,
  customs: ShareOgCustomEntry[] | undefined,
  layouts: ShareOgLayouts | undefined,
  seed: string,
  prev: ShareOgThemeState,
  removeImageId?: string | null,
): ShareOgThemeState {
  const removeId = removeImageId?.trim() || null;
  let nextActive = active ?? prev.active;
  if (
    removeId &&
    nextActive.kind === "custom" &&
    nextActive.imageId === removeId
  ) {
    nextActive = { kind: "preset", id: "paper" };
  }

  let nextCustoms = mergeShareOgCustoms(prev.customs, customs, removeId);

  if (nextActive.kind === "custom") {
    nextCustoms = prependShareOgCustom(nextCustoms, nextActive.imageId);
  }

  return {
    ...parseShareOgThemeState(
      {
        active: nextActive,
        customs: nextCustoms,
        layouts: layouts ?? prev.layouts,
      },
      seed,
    ),
    /** PATCH theme/layout không đụng snapshot đã publish. */
    ogSnapshots: prev.ogSnapshots ?? {},
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();
  const orgId = searchParams.get("orgId")?.trim();
  const admin = createServiceRoleClient();

  if (orgId) {
    const session = await getCurrentSessionAndProfile();
    const { data, error } = await admin
      .from("org_to_chuc")
      .select("id, slug, cau_hinh")
      .eq("id", orgId)
      .maybeSingle<{
        id: string;
        slug: string;
        cau_hinh: Record<string, unknown> | null;
      }>();
    if (error || !data) {
      return NextResponse.json({ error: "Không tìm thấy tổ chức." }, { status: 404 });
    }
    const raw = data.cau_hinh?.share_og_theme ?? null;
    const state = parseShareOgThemeState(raw, data.slug);
    const canEdit = Boolean(
      session?.profile?.id &&
        (await isTruongOrgAdmin(orgId, session.profile.id)),
    );
    return NextResponse.json({ state, canEdit });
  }

  if (!slug) {
    return NextResponse.json({ error: "Thiếu slug hoặc orgId." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, theme")
    .eq("slug", slug)
    .maybeSingle<{ id: string; slug: string; theme: string | null }>();

  if (error || !data) {
    return NextResponse.json({ error: "Không tìm thấy hồ sơ." }, { status: 404 });
  }

  const session = await getCurrentSessionAndProfile();
  const canEdit = Boolean(
    session?.profile?.id && session.profile.id === data.id,
  );
  const state = parseShareOgThemeState(data.theme, data.slug);
  return NextResponse.json({ state, canEdit });
}

export async function PATCH(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const orgId = body.orgId?.trim();

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
    const removeId = body.removeImageId?.trim() || null;
    const next = normalizeState(
      body.active,
      body.customs,
      body.layouts,
      org.slug,
      prev,
      removeId,
    );

    if (removeId) {
      void deleteCloudflareImage(removeId);
    }

    const cauHinh = {
      ...(org.cau_hinh && typeof org.cau_hinh === "object" ? org.cau_hinh : {}),
      share_og_theme: shareOgThemeStatePayload(next),
    };

    const { error: updErr } = await admin
      .from("org_to_chuc")
      .update({ cau_hinh: cauHinh })
      .eq("id", orgId);

    if (updErr) {
      return NextResponse.json(
        { error: "Không lưu được theme." },
        { status: 500 },
      );
    }

    return NextResponse.json({ state: next });
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
  const removeId = body.removeImageId?.trim() || null;
  const next = normalizeState(
    body.active,
    body.customs,
    body.layouts,
    user.slug,
    prev,
    removeId,
  );

  if (removeId) {
    void deleteCloudflareImage(removeId);
  }

  const { error: updErr } = await admin
    .from("user_nguoi_dung")
    .update({ theme: serializeShareOgThemeState(next) })
    .eq("id", profileId);

  if (updErr) {
    return NextResponse.json({ error: "Không lưu được theme." }, { status: 500 });
  }

  return NextResponse.json({ state: next });
}
