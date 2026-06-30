import { NextResponse } from "next/server";

import { setUserSystemRole } from "@/lib/admin/nguoi-dung-roles";
import {
  canManageUsers,
  getCurrentUserProfileId,
  getCurrentUserSystemRole,
  type SystemRole,
} from "@/lib/auth/system-role";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_ROLES = new Set<SystemRole>([
  "admin",
  "curator",
  "thanh_vien",
]);

function parseRole(body: unknown): SystemRole | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as Record<string, unknown>).role;
  if (typeof raw !== "string") return null;
  const role = raw.trim() as SystemRole;
  return ALLOWED_ROLES.has(role) ? role : null;
}

export async function PATCH(req: Request, context: RouteContext) {
  const actorRole = await getCurrentUserSystemRole();
  if (!canManageUsers(actorRole)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newRole = parseRole(body);
  if (!newRole) {
    return NextResponse.json({ error: "Vai trò không hợp lệ." }, { status: 400 });
  }

  const actorProfileId = await getCurrentUserProfileId();
  const result = await setUserSystemRole({
    actorRole,
    actorProfileId,
    targetUserId: id.trim(),
    newRole,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
