import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listOrgInboxThreadsForStaff } from "@/lib/chat/org-message";

type RouteContext = { params: Promise<{ orgId: string }> };

/** GET /api/org/:orgId/inbox/threads — hộp thư org (staff). */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId } = await ctx.params;
  const result = await listOrgInboxThreadsForStaff(orgId, session.profile.id);
  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const unreadCount = result.threads.filter((thread) => thread.unread).length;
  return NextResponse.json({ threads: result.threads, unreadCount });
}
