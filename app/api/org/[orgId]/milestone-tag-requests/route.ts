import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listOrgMilestoneTagRequests } from "@/lib/journey/org-milestone-tag";

type RouteContext = { params: Promise<{ orgId: string }> };

/** GET /api/org/:orgId/milestone-tag-requests */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  const result = await listOrgMilestoneTagRequests(orgId, session.profile.id);
  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ items: result.items });
}
