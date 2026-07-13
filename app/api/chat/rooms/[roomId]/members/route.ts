import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { addGroupMembers, listGroupMembers } from "@/lib/chat/group-message";

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

  const result = await listGroupMembers(roomId.trim(), session.profile.id);
  if (!result.ok) {
    const status =
      result.error.includes("quyền") || result.error.includes("admin")
        ? 403
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    members: result.members,
    isGroupAdmin: result.isGroupAdmin,
    isGroupOwner: result.isGroupOwner,
    tenPhong: result.tenPhong,
    memberCount: result.memberCount,
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

  let body: {
    userIds?: string[];
    id_thanh_vien?: string[];
    userId?: string;
  };
  try {
    body = (await req.json()) as {
      userIds?: string[];
      id_thanh_vien?: string[];
      userId?: string;
    };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const fromArray = Array.isArray(body.userIds)
    ? body.userIds
    : Array.isArray(body.id_thanh_vien)
      ? body.id_thanh_vien
      : [];
  const memberIds =
    fromArray.length > 0
      ? fromArray
      : body.userId?.trim()
        ? [body.userId.trim()]
        : [];

  const result = await addGroupMembers(
    roomId.trim(),
    session.profile.id,
    memberIds,
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
  });
}
