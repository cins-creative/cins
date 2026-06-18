import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { respondOrgMembershipMilestoneRequest } from "@/lib/journey/membership-milestone";

type RouteContext = {
  params: Promise<{ orgId: string; requestId: string }>;
};

/** PATCH /api/org/:orgId/membership-milestone-requests/:requestId — approve | reject */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId, requestId } = await ctx.params;
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const action = body.action === "reject" ? "reject" : "approve";
  const result = await respondOrgMembershipMilestoneRequest({
    orgId,
    requestId,
    viewerId: session.profile.id,
    action,
  });

  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
