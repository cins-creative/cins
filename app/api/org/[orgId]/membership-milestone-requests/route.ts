import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listOrgMembershipMilestoneRequests } from "@/lib/journey/membership-milestone";

type RouteContext = { params: Promise<{ orgId: string }> };

/** GET /api/org/:orgId/membership-milestone-requests */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  const result = await listOrgMembershipMilestoneRequests(
    orgId,
    session.profile.id,
  );
  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ items: result.items });
}
