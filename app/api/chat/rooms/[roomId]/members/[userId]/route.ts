import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  kickGroupMember,
  setGroupMemberRole,
} from "@/lib/chat/group-message";
import type { ChatGroupVaiTro } from "@/lib/chat/types";

type RouteContext = {
  params: Promise<{ roomId: string; userId: string }>;
};

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId, userId } = await ctx.params;
  if (!roomId?.trim() || !userId?.trim()) {
    return NextResponse.json({ error: "Thiếu tham số." }, { status: 400 });
  }

  let body: { vaiTro?: string; vai_tro?: string };
  try {
    body = (await req.json()) as { vaiTro?: string; vai_tro?: string };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const raw =
    body.vaiTro !== undefined ? body.vaiTro : (body.vai_tro ?? "");
  const vaiTro = raw.trim() as ChatGroupVaiTro;
  if (vaiTro !== "admin" && vaiTro !== "thanh_vien") {
    return NextResponse.json({ error: "Vai trò không hợp lệ." }, { status: 400 });
  }

  const result = await setGroupMemberRole(
    roomId.trim(),
    session.profile.id,
    userId.trim(),
    vaiTro,
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

export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId, userId } = await ctx.params;
  if (!roomId?.trim() || !userId?.trim()) {
    return NextResponse.json({ error: "Thiếu tham số." }, { status: 400 });
  }

  const result = await kickGroupMember(
    roomId.trim(),
    session.profile.id,
    userId.trim(),
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
