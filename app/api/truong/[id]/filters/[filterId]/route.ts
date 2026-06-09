import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { deleteTruongOrgFilter } from "@/lib/truong/org-bai-dang-filters";

type RouteContext = { params: Promise<{ id: string; filterId: string }> };

/** DELETE /api/truong/:id/filters/:filterId */
export async function DELETE(req: Request, ctx: RouteContext) {
  const { id: orgId, filterId } = await ctx.params;
  if (!orgId?.trim() || !filterId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(req, orgId);
  if (denied) return denied;

  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const result = await deleteTruongOrgFilter({
    orgId,
    filterId,
    adminId: session.profile.id,
  });

  if (!result.ok) {
    const status =
      result.error.includes("admin") || result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
