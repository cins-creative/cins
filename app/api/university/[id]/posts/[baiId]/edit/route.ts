import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { fetchOrgBaiDangEditInitial } from "@/lib/truong/fetch-org-bai-dang-edit-initial";

type RouteContext = { params: Promise<{ id: string; baiId: string }> };

/** GET /api/truong/:id/bai-dang/:baiId/edit */
export async function GET(req: Request, ctx: RouteContext) {
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

  const result = await fetchOrgBaiDangEditInitial({
    orgId,
    baiDangId: baiId,
    adminId: session.profile.id,
  });

  if (!result.ok) {
    const status = result.error === "forbidden" ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    postSlug: result.postSlug,
    initial: result.initial,
  });
}
