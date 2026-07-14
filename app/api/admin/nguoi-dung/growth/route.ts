import { NextResponse } from "next/server";

import { fetchAdminUserGrowth } from "@/lib/admin/nguoi-dung-growth";
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
  const daysRaw = Number(url.searchParams.get("days") ?? 30);
  const days = daysRaw <= 7 ? 7 : 30;

  try {
    const growth = await fetchAdminUserGrowth(days);
    return NextResponse.json({ growth });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không tải được báo cáo tài khoản mới.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
