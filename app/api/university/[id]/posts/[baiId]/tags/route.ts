import { NextResponse } from "next/server";

import type { ArticleTagRef } from "@/lib/editor/article-tag";
import {
  loadOrgBaiDangArticleTags,
  syncOrgBaiDangArticleTags,
} from "@/lib/truong/org-bai-dang-article-tags";
import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteCtx = { params: Promise<{ id: string; baiId: string }> };

async function assertOrgBaiDangInOrg(
  orgId: string,
  baiDangId: string,
): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_bai_dang")
    .select("id")
    .eq("id", baiDangId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id: orgId, baiId } = await ctx.params;
  if (!orgId?.trim() || !baiId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(_req, orgId);
  if (denied) return denied;

  if (!(await assertOrgBaiDangInOrg(orgId, baiId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createServiceRoleClient();
  const tags = await loadOrgBaiDangArticleTags(admin, baiId);
  return NextResponse.json({ tags });
}

export async function PUT(req: Request, ctx: RouteCtx) {
  const { id: orgId, baiId } = await ctx.params;
  if (!orgId?.trim() || !baiId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(req, orgId);
  if (denied) return denied;

  if (!(await assertOrgBaiDangInOrg(orgId, baiId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const result = await syncOrgBaiDangArticleTags(admin, baiId, normalized);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const tags = await loadOrgBaiDangArticleTags(admin, baiId);
  return NextResponse.json({ ok: true, tags });
}
