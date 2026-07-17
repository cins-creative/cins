import { NextResponse } from "next/server";

import { countAdminInboxStats } from "@/lib/admin/admin-inbox-stats";
import {
  canManageUsers,
  getCurrentUserProfileId,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** GET /api/admin/inbox-stats — số việc cần xử lý cho admin/super_admin. */
export async function GET() {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Server chưa cấu hình service role." },
      { status: 500 },
    );
  }

  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profileId = await getCurrentUserProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await countAdminInboxStats();
    return NextResponse.json({ stats });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không tải được thống kê inbox admin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
