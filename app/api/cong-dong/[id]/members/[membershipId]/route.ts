import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  approveCongDongJoinRequest,
  rejectCongDongJoinRequest,
  updateCongDongMemberRole,
} from "@/lib/cong-dong/members";

type RouteContext = { params: Promise<{ id: string; membershipId: string }> };

/** PATCH /api/cong-dong/:id/members/:membershipId */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, membershipId } = await ctx.params;
  let body: { vaiTro?: string; action?: "approve" | "reject" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  if (body.action === "approve") {
    const result = await approveCongDongJoinRequest({
      orgId,
      actorId: session.profile.id,
      membershipId,
    });
    if (!result.ok) {
      const status = result.error.includes("admin")
        ? 403
        : result.error.includes("Không tìm")
          ? 404
          : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true, member: result.member });
  }

  if (body.action === "reject") {
    const result = await rejectCongDongJoinRequest({
      orgId,
      actorId: session.profile.id,
      membershipId,
    });
    if (!result.ok) {
      const status = result.error.includes("admin")
        ? 403
        : result.error.includes("Không tìm")
          ? 404
          : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true });
  }

  const result = await updateCongDongMemberRole({
    orgId,
    actorId: session.profile.id,
    membershipId,
    vaiTro: body.vaiTro ?? "",
  });

  if (!result.ok) {
    const status = result.error.includes("admin")
      ? 403
      : result.error.includes("Không tìm")
        ? 404
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, member: result.member });
}
