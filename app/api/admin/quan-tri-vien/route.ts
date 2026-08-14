import { NextResponse } from "next/server";

import { fetchAdminStaffList } from "@/lib/admin/quan-tri-vien";
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
  const role = url.searchParams.get("role")?.trim() ?? "";

  const data = await fetchAdminStaffList({ q, role, actorRole });
  return NextResponse.json(data);
}
