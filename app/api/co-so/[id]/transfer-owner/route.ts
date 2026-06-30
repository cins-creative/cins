import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { transferCoSoOwnership } from "@/lib/to-chuc/co-so-members";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/co-so/:id/transfer-owner — bàn giao quyền sở hữu. */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  let body: { membershipId?: string; confirmSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  if (!body.membershipId) {
    return NextResponse.json({ error: "Thiếu thành viên nhận." }, { status: 400 });
  }

  const result = await transferCoSoOwnership({
    orgId,
    actorId: session.profile.id,
    membershipId: body.membershipId,
    confirmSlug: body.confirmSlug ?? "",
  });

  if (!result.ok) {
    const status = result.error.includes("quyền")
      ? 403
      : result.error.includes("Không tìm")
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, members: result.members });
}
