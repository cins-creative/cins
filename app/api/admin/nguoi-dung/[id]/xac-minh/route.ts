import { NextResponse } from "next/server";

import { setUserVerified } from "@/lib/admin/nguoi-dung-roles";
import {
  canManageUsers,
  getCurrentUserProfileId,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

type RouteContext = { params: Promise<{ id: string }> };

function parseVerified(body: unknown): boolean | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as Record<string, unknown>).verified;
  return typeof raw === "boolean" ? raw : null;
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

  const verified = parseVerified(body);
  if (verified === null) {
    return NextResponse.json(
      { error: "Thiếu trường verified (boolean)." },
      { status: 400 },
    );
  }

  const actorProfileId = await getCurrentUserProfileId();
  const result = await setUserVerified({
    actorRole,
    actorProfileId,
    targetUserId: id.trim(),
    verified,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, daXacMinh: result.daXacMinh });
}
