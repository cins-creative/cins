import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  addCongDongMember,
  addCongDongMemberBySlug,
  listCongDongMembers,
} from "@/lib/cong-dong/members";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/cong-dong/:id/members */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  const result = await listCongDongMembers({
    orgId,
    actorId: session.profile.id,
  });

  if (!result.ok) {
    const status = result.error.includes("admin") ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    members: result.members,
    pending: result.pending,
  });
}

/** POST /api/cong-dong/:id/members — thêm hoặc cập nhật quyền theo user */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  let body: { userId?: string; slug?: string; vaiTro?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = body.userId
    ? await addCongDongMember({
        orgId,
        actorId: session.profile.id,
        userId: body.userId,
        vaiTro: body.vaiTro,
      })
    : await addCongDongMemberBySlug({
        orgId,
        actorId: session.profile.id,
        slug: body.slug ?? "",
        vaiTro: body.vaiTro,
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
