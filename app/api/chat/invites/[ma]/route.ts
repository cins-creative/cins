import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getGroupInvitePreview,
  requestJoinGroupByInvite,
} from "@/lib/chat/group-invite";

type RouteContext = { params: Promise<{ ma: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  const { ma } = await ctx.params;
  if (!ma?.trim()) {
    return NextResponse.json({ error: "Thiếu mã mời." }, { status: 400 });
  }

  const result = await getGroupInvitePreview(
    decodeURIComponent(ma.trim()),
    session?.profile?.id ?? null,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ preview: result.preview });
}

export async function POST(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { ma } = await ctx.params;
  if (!ma?.trim()) {
    return NextResponse.json({ error: "Thiếu mã mời." }, { status: 400 });
  }

  const result = await requestJoinGroupByInvite(
    decodeURIComponent(ma.trim()),
    session.profile.id,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ preview: result.preview });
}
