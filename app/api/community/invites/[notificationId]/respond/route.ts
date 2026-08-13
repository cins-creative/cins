import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { respondCongDongInvite } from "@/lib/cong-dong/invite";

type RouteContext = { params: Promise<{ notificationId: string }> };

/** POST /api/cong-dong/invites/:notificationId/respond — chấp nhận / từ chối lời mời. */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { notificationId } = await ctx.params;
  if (!notificationId?.trim()) {
    return NextResponse.json({ error: "Thiếu mã lời mời." }, { status: 400 });
  }

  let body: { action?: unknown };
  try {
    body = (await req.json()) as { action?: unknown };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const action = body.action === "accept" || body.action === "decline" ? body.action : null;
  if (!action) {
    return NextResponse.json(
      { error: "action phải là accept hoặc decline." },
      { status: 400 },
    );
  }

  const result = await respondCongDongInvite({
    viewerId: session.profile.id,
    notificationId: notificationId.trim(),
    action,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, orgSlug: result.orgSlug ?? null });
}
