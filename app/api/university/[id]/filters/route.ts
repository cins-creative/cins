import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { countOrgBaiDangFiltersForOrg } from "@/lib/filter/org-bai-dang-gan";
import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import {
  createTruongOrgFilter,
  listTruongOrgFilters,
} from "@/lib/truong/org-bai-dang-filters";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

async function getTruongOrg(orgId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .maybeSingle<{ id: string }>();
  return data;
}

/** GET /api/truong/:id/filters — nhãn tùy chỉnh timeline bài đăng. */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id: orgId } = await ctx.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  if (!(await getTruongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy trường." }, { status: 404 });
  }

  const filters = await listTruongOrgFilters(orgId);
  const counts = await countOrgBaiDangFiltersForOrg(orgId, filters.map((f) => f.id));
  const withCounts = filters.map((f) => ({
    id: f.id,
    ten: f.ten,
    slug: f.slug,
    mau: f.mau,
    thuTu: f.thuTu,
    count: counts.get(f.id) ?? 0,
  }));

  return NextResponse.json({ filters: withCounts });
}

/** POST /api/truong/:id/filters — admin tạo nhãn tùy chỉnh. */
export async function POST(req: Request, ctx: RouteContext) {
  const { id: orgId } = await ctx.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(req, orgId);
  if (denied) return denied;

  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { ten?: string; mau?: string; thu_tu?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await createTruongOrgFilter({
    orgId,
    adminId: session.profile.id,
    ten: body.ten ?? "",
    mau: body.mau,
    thuTu: body.thu_tu,
  });

  if (!result.ok) {
    const status =
      result.error.includes("admin") || result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    filter: {
      id: result.filter.id,
      ten: result.filter.ten,
      slug: result.filter.slug,
      mau: result.filter.mau,
      thuTu: result.filter.thuTu,
      count: 0,
    },
  });
}
