import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  createShareLink,
  normalizeShareTargetPath,
} from "@/lib/journey/share-link";
import {
  cfImagePublicUrl,
  parseShareOgThemeState,
  type ShareOgThemeState,
} from "@/lib/journey/share-og-theme";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { isTruongOrgAdmin } from "@/lib/truong/org-admin";

type CreateBody = {
  targetUrl?: unknown;
  title?: unknown;
  description?: unknown;
  imageId?: unknown;
  orgId?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pathContainsSlug(targetPath: string, slug: string): boolean {
  const pathname = targetPath.split("?")[0] ?? "";
  return pathname.split("/").filter(Boolean).some((segment) => {
    try {
      return decodeURIComponent(segment) === slug;
    } catch {
      return false;
    }
  });
}

function stateContainsImage(state: ShareOgThemeState, imageId: string): boolean {
  if (state.active.kind === "custom" && state.active.imageId === imageId) {
    return true;
  }
  if (state.customs.some((item) => item.imageId === imageId)) return true;
  return Object.values(state.ogSnapshots).some(
    (snapshot) => snapshot.imageId === imageId,
  );
}

export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const targetPath = normalizeShareTargetPath(text(body.targetUrl));
  const title = text(body.title);
  const description = text(body.description);
  const imageId = text(body.imageId);
  const orgId = text(body.orgId);
  const imageUrl = cfImagePublicUrl(imageId);
  if (!targetPath || !title || !imageId || !imageUrl) {
    return NextResponse.json(
      { error: "Thiếu hoặc sai thông tin short-link." },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
  if (orgId) {
    if (!(await isTruongOrgAdmin(orgId, session.profile.id))) {
      return NextResponse.json(
        { error: "Bạn không có quyền tạo link cho tổ chức này." },
        { status: 403 },
      );
    }
    const { data: org } = await admin
      .from("org_to_chuc")
      .select("slug, cau_hinh")
      .eq("id", orgId)
      .maybeSingle<{
        slug: string | null;
        cau_hinh: Record<string, unknown> | null;
      }>();
    const orgSlug = org?.slug?.trim();
    if (!orgSlug || !pathContainsSlug(targetPath, orgSlug)) {
      return NextResponse.json(
        { error: "Đường dẫn không thuộc tổ chức này." },
        { status: 400 },
      );
    }
    const state = parseShareOgThemeState(
      org?.cau_hinh?.share_og_theme ?? null,
      orgSlug,
    );
    if (!stateContainsImage(state, imageId)) {
      return NextResponse.json(
        { error: "Ảnh không thuộc thẻ chia sẻ của tổ chức." },
        { status: 403 },
      );
    }
  } else {
    if (!pathContainsSlug(targetPath, session.profile.slug)) {
      return NextResponse.json(
        { error: "Đường dẫn không thuộc hồ sơ của bạn." },
        { status: 403 },
      );
    }
    const { data: user } = await admin
      .from("user_nguoi_dung")
      .select("theme")
      .eq("id", session.profile.id)
      .maybeSingle<{ theme: string | null }>();
    const state = parseShareOgThemeState(
      user?.theme ?? null,
      session.profile.slug,
    );
    if (!stateContainsImage(state, imageId)) {
      return NextResponse.json(
        { error: "Ảnh không thuộc thẻ chia sẻ của hồ sơ." },
        { status: 403 },
      );
    }
  }

  const created = await createShareLink({
    creatorId: session.profile.id,
    orgId: orgId || null,
    targetPath,
    title,
    description,
    imageId,
    imageUrl,
  });
  if (!created) {
    return NextResponse.json(
      { error: "Không tạo được short-link." },
      { status: 500 },
    );
  }

  const target = new URL(created.targetPath, "https://cins.vn");
  target.searchParams.set("s", created.token);

  return NextResponse.json({
    token: created.token,
    shortPath: `/s/${created.token}`,
    targetPath: `${target.pathname}${target.search}`,
  });
}
