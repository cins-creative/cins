import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchCoAuthorInviteMilestoneCard } from "@/lib/journey/coauthor-invite-milestone";

type RouteCtx = { params: Promise<{ id: string }> };

/** GET — preload card timeline cho lời mời đồng tác giả đang pending. */
export async function GET(_req: Request, ctx: RouteCtx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: tacPhamId } = await ctx.params;
  const result = await fetchCoAuthorInviteMilestoneCard(
    tacPhamId,
    session.profile.id,
  );

  if (!result.ok) {
    const status = result.error.includes("Không tìm thấy") ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ milestone: result.milestone });
}
