import { NextResponse } from "next/server";

import {
  canEditStaffTabs,
  lockSelfManageTab,
  upsertUserAdminTabAn,
} from "@/lib/admin/admin-tab-visibility";
import { sanitizeAdminTabKeys } from "@/lib/admin/admin-nav";
import { fetchStaffRoleByUserId } from "@/lib/admin/quan-tri-vien";
import {
  canManageUsers,
  getCurrentUserProfileId,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const actorRole = await getCurrentUserSystemRole();
  if (!canManageUsers(actorRole)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const targetUserId = id?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: "Thiếu id user." }, { status: 400 });
  }

  const target = await fetchStaffRoleByUserId(targetUserId);
  if (!target) {
    return NextResponse.json({ error: "Không tìm thấy user." }, { status: 404 });
  }
  if (!canEditStaffTabs(actorRole, target.role)) {
    return NextResponse.json(
      { error: "Không được sửa tab của người này." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" && "tabAn" in body
      ? (body as { tabAn: unknown }).tabAn
      : null;
  const actorProfileId = await getCurrentUserProfileId();
  const tabAn = lockSelfManageTab(
    actorProfileId,
    targetUserId,
    sanitizeAdminTabKeys(raw),
  );

  const saved = await upsertUserAdminTabAn({
    targetUserId,
    tabAn,
    actorProfileId,
  });
  if (!saved.ok) {
    return NextResponse.json(
      { error: saved.message },
      { status: saved.missingTable ? 503 : 500 },
    );
  }

  return NextResponse.json({ ok: true, tabAn });
}
