import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  removeCoSoStaffMember,
  updateCoSoStaffMemberRole,
} from "@/lib/to-chuc/co-so-members";

type RouteContext = { params: Promise<{ id: string; membershipId: string }> };

/** PATCH /api/co-so/:id/members/:membershipId */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, membershipId } = await ctx.params;
  let body: { vaiTro?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await updateCoSoStaffMemberRole({
    orgId,
    actorId: session.profile.id,
    membershipId,
    vaiTro: body.vaiTro ?? "",
  });

  if (!result.ok) {
    const status = result.error.includes("quyền")
      ? 403
      : result.error.includes("Không tìm")
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, member: result.member });
}

/** DELETE /api/co-so/:id/members/:membershipId */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, membershipId } = await ctx.params;
  const result = await removeCoSoStaffMember({
    orgId,
    actorId: session.profile.id,
    membershipId,
  });

  if (!result.ok) {
    const status = result.error.includes("quyền")
      ? 403
      : result.error.includes("Không tìm")
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
