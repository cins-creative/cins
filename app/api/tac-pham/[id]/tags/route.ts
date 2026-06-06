import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import {
  loadTacPhamArticleTags,
  syncTacPhamArticleTags,
} from "@/lib/journey/sync-tac-pham-tags";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteCtx = { params: Promise<{ id: string }> };

async function assertTacPhamOwner(
  tacPhamId: string,
  userId: string,
): Promise<{ ok: true; ownerSlug: string } | { ok: false }> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_tac_pham")
    .select("id_nguoi_dung, user_nguoi_dung: id_nguoi_dung ( slug )")
    .eq("id", tacPhamId)
    .maybeSingle();

  if (!data || data.id_nguoi_dung !== userId) {
    return { ok: false };
  }

  const ownerSlug =
    (data.user_nguoi_dung as { slug?: string | null } | null)?.slug?.trim() ??
    "";

  return { ok: true, ownerSlug };
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: tacPhamId } = await ctx.params;
  const owner = await assertTacPhamOwner(tacPhamId, session.profile.id);
  if (!owner.ok) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const tags = await loadTacPhamArticleTags(admin, tacPhamId);
  return NextResponse.json({ tags });
}

export async function PUT(req: Request, ctx: RouteCtx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: tacPhamId } = await ctx.params;
  const owner = await assertTacPhamOwner(tacPhamId, session.profile.id);
  if (!owner.ok) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  let body: { tags?: ArticleTagRef[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  if (!Array.isArray(body.tags)) {
    return NextResponse.json({ error: "Thiếu mảng tags." }, { status: 400 });
  }

  const normalized: ArticleTagRef[] = [];
  for (const t of body.tags) {
    if (!t || typeof t !== "object") continue;
    const id = typeof t.id === "string" ? t.id.trim() : "";
    const slug = typeof t.slug === "string" ? t.slug.trim() : "";
    if (!id || !slug) continue;
    normalized.push({
      id,
      slug,
      tieu_de:
        typeof t.tieu_de === "string" && t.tieu_de.trim()
          ? t.tieu_de.trim()
          : "Không tiêu đề",
      loai_bai_viet:
        typeof t.loai_bai_viet === "string" && t.loai_bai_viet.trim()
          ? t.loai_bai_viet.trim()
          : "blog",
      tom_tat:
        typeof t.tom_tat === "string" ? t.tom_tat.trim() || null : null,
    });
  }

  const admin = createServiceRoleClient();
  const result = await syncTacPhamArticleTags(
    admin,
    tacPhamId,
    normalized,
    owner.ownerSlug || session.profile.slug,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tags: normalized });
}
