import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { setOrgBaiDangPersonalFilters } from "@/lib/filter/org-bai-dang-gan";
import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";

type RouteContext = { params: Promise<{ id: string; baiId: string }> };

/** PUT /api/truong/:id/bai-dang/:baiId/filters — gắn nhãn tùy chỉnh. */
export async function PUT(req: Request, ctx: RouteContext) {
  const { id: orgId, baiId } = await ctx.params;
  if (!orgId?.trim() || !baiId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(req, orgId);
  if (denied) return denied;

  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { filterIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const filterIds = Array.isArray(body.filterIds)
    ? body.filterIds.filter((id): id is string => typeof id === "string")
    : [];

  const result = await setOrgBaiDangPersonalFilters({
    postId: baiId,
    orgId,
    adminId: session.profile.id,
    filterIds,
  });

  if (!result.ok) {
    const status =
      result.error.includes("admin") || result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    filters: result.filters,
    personalFilterSlugs: result.filters.map((f) => f.slug),
  });
}
