import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  loadCongDongCategories,
  updateCongDongCategories,
} from "@/lib/cong-dong/categories";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

async function getCongDongOrg(orgId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ id: string }>();
  return data;
}

/** GET /api/cong-dong/:id/categories */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id: orgId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }
  const categories = await loadCongDongCategories(orgId);
  return NextResponse.json({ categories });
}

/** PATCH /api/cong-dong/:id/categories — admin cập nhật chủ đề nghề/ngành */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  let body: { articleIds?: string[]; danh_muc?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const articleIds = Array.isArray(body.articleIds)
    ? body.articleIds
    : Array.isArray(body.danh_muc)
      ? body.danh_muc
      : [];

  const result = await updateCongDongCategories({
    orgId,
    adminId: session.profile.id,
    articleIds,
  });

  if (!result.ok) {
    const status = result.error.includes("admin") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, categories: result.categories });
}
