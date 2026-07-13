import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  listGroupJoinRequests,
  respondGroupJoinRequest,
} from "@/lib/chat/group-invite";

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

  const result = await listGroupJoinRequests(
    roomId.trim(),
    session.profile.id,
  );
  if (!result.ok) {
    const status =
      result.error.includes("quyền") || result.error.includes("admin")
        ? 403
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ requests: result.requests });
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await ctx.params;
  if (!roomId?.trim()) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  let body: { requestId?: string; action?: string };
  try {
    body = (await req.json()) as { requestId?: string; action?: string };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const requestId = body.requestId?.trim();
  const action = body.action === "approve" || body.action === "reject"
    ? body.action
    : null;

  if (!requestId || !action) {
    return NextResponse.json(
      { error: "Thiếu requestId hoặc action." },
      { status: 400 },
    );
  }

  const result = await respondGroupJoinRequest(
    roomId.trim(),
    session.profile.id,
    requestId,
    action,
  );

  if (!result.ok) {
    const status =
      result.error.includes("quyền") || result.error.includes("admin")
        ? 403
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    thread: result.thread,
    members: result.members,
    requests: result.requests,
  });
}
