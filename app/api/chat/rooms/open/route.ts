import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { openDirectRoom } from "@/lib/chat/direct-message";

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { id_nguoi?: string };
  try {
    body = (await req.json()) as { id_nguoi?: string };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const targetUserId = body.id_nguoi?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: "Thiếu id_nguoi." }, { status: 400 });
  }

  const result = await openDirectRoom(session.profile.id, targetUserId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ thread: result.thread });
}
