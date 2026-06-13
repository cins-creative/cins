import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { respondCoSoStaffInvite } from "@/lib/to-chuc/co-so-staff-invite";

type RouteContext = { params: Promise<{ id: string; membershipId: string }> };

/** POST /api/co-so/:id/members/:membershipId/respond */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { membershipId } = await ctx.params;
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const action = body.action === "decline" ? "decline" : "accept";
  const result = await respondCoSoStaffInvite({
    viewerId: session.profile.id,
    membershipId,
    action,
  });

  if (!result.ok) {
    const status = result.error.includes("Không tìm") ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, action });
}
