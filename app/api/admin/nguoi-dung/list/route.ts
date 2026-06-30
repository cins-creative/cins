import { NextResponse } from "next/server";

import { fetchAdminUserList } from "@/lib/admin/nguoi-dung-roles";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

export async function GET(req: Request) {
  const actorRole = await getCurrentUserSystemRole();
  if (!canManageUsers(actorRole)) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  const data = await fetchAdminUserList({ q, actorRole });
  return NextResponse.json(data);
}
