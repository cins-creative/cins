import { NextResponse } from "next/server";

import { deleteAdminUser } from "@/lib/admin/nguoi-dung-roles";
import {
  canDeleteUsers,
  getCurrentUserProfileId,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

type RouteContext = { params: Promise<{ id: string }> };

/** DELETE /api/admin/nguoi-dung/:id — soft-delete user. Chỉ Admin tối cao. */
export async function DELETE(_req: Request, context: RouteContext) {
  const actorRole = await getCurrentUserSystemRole();
  if (!canDeleteUsers(actorRole)) {
    return NextResponse.json(
      { error: "Chỉ Admin tối cao mới được xóa user." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const actorProfileId = await getCurrentUserProfileId();
  const result = await deleteAdminUser({
    actorRole,
    actorProfileId,
    targetUserId: id.trim(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    slug: result.slug,
    canhBaoXoaAuth: result.canhBaoXoaAuth ?? null,
  });
}
