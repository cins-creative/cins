import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { canManageCoSoMembers } from "@/lib/to-chuc/co-so-vai-tro";
import {
  addStudioStaffMember,
  addStudioStaffMemberBySlug,
  listStudioStaffMembers,
} from "@/lib/to-chuc/studio-members";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/studio/:id/members — danh sách + vai trò người xem. */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  const result = await listStudioStaffMembers({
    orgId,
    actorId: session.profile.id,
  });

  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  const vaiTro = await getViewerCoSoVaiTro(session.profile.id, orgId);
  return NextResponse.json({
    members: result.members,
    viewer: {
      vaiTro,
      canManage: canManageCoSoMembers(vaiTro),
      isOwner: vaiTro === "owner",
    },
  });
}

/** POST /api/studio/:id/members — mời / thêm thành viên. */
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
    ? await addStudioStaffMember({
        orgId,
        actorId: session.profile.id,
        userId: body.userId,
        vaiTro: body.vaiTro,
      })
    : await addStudioStaffMemberBySlug({
        orgId,
        actorId: session.profile.id,
        slug: body.slug ?? "",
        vaiTro: body.vaiTro,
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
