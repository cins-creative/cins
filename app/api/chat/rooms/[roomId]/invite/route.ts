import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { ensureGroupInviteCode } from "@/lib/chat/group-invite";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await ctx.params;
  if (!roomId?.trim()) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  const result = await ensureGroupInviteCode(
    roomId.trim(),
    session.profile.id,
    false,
  );
  if (!result.ok) {
    const status =
      result.error.includes("quyền") || result.error.includes("admin")
        ? 403
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    maMoi: result.maMoi,
    inviteUrl: result.inviteUrl,
  });
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await ctx.params;
  if (!roomId?.trim()) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  let body: { rotate?: boolean } = {};
  try {
    body = (await req.json()) as { rotate?: boolean };
  } catch {
    body = {};
  }

  const result = await ensureGroupInviteCode(
    roomId.trim(),
    session.profile.id,
    Boolean(body.rotate),
  );
  if (!result.ok) {
    const status =
      result.error.includes("quyền") || result.error.includes("admin")
        ? 403
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    maMoi: result.maMoi,
    inviteUrl: result.inviteUrl,
  });
}
