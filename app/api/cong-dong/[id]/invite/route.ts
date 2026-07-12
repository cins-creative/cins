import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  inviteFriendsToCongDong,
  listCongDongInviteCandidates,
} from "@/lib/cong-dong/invite";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

async function assertCongDongOrg(orgId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle();
  return Boolean(data);
}

/** GET /api/cong-dong/:id/invite — danh sách bạn bè có thể mời. */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!(await assertCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  const result = await listCongDongInviteCandidates(session.profile.id, orgId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    friends: result.friends,
    orgTen: result.orgTen,
  });
}

/** POST /api/cong-dong/:id/invite — gửi lời mời tới bạn bè. */
export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!(await assertCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  let body: { userIds?: unknown };
  try {
    body = (await req.json()) as { userIds?: unknown };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const userIds = Array.isArray(body.userIds)
    ? body.userIds.filter((id): id is string => typeof id === "string")
    : [];

  const result = await inviteFriendsToCongDong({
    viewerId: session.profile.id,
    orgId,
    inviteeIds: userIds,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
